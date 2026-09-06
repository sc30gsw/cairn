import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { ConflictError, ValidationFailedError } from "../../lib/errors";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import { deleteEvent, insertEvent, isAuthFailure, isGone } from "../../lib/googleCalendar";
import { throwDomain } from "../../lib/ownerFunctions";
import { payloadKey } from "./eventPayload";
import { markTokenFailure, markSyncError, markNeedsReauth } from "./syncFailure";

export async function changeOutput(
  ctx: ActionCtx,
  args: { ownerId: string; connectionId: Id<"calendarConnections">; calendarId: string },
) {
  await ctx.runMutation(internal.mutations.calendarSync.beginOutputChange.beginOutputChange, args);
  return await continueOutputChange(ctx, args.ownerId);
}

export async function continueOutputChange(
  ctx: ActionCtx,
  ownerId: string,
): Promise<"ok" | "moving"> {
  const plan = await ctx.runQuery(internal.queries.calendarSync.outputMigration.outputMigration, {
    ownerId,
  });
  if (plan === null) return "ok";
  const destinationToken = await getGoogleAccessToken(ctx, {
    accountId: plan.googleAccountId,
    userId: ownerId,
  });
  if (Result.isError(destinationToken)) {
    const outcome = await markTokenFailure(ctx, ownerId, destinationToken.error, plan.connectionId);
    throwDomain(
      new ValidationFailedError({
        message:
          outcome === "needsReauth"
            ? "書き込み先の Google アカウントを再接続してください"
            : "Google との通信に失敗しました。少し待って移動を再開してください",
      }),
    );
  }
  for (const { link, desired, googleAccountId, connectionId: sourceConnectionId } of plan.links) {
    let pending = link.pendingMove;
    if (desired === null && (link.calendarId !== plan.calendarId || pending !== undefined)) {
      const eventId =
        pending?.googleEventId ?? (await outputMoveEventId(link._id, plan.generation));
      const removed = await deleteEvent(
        { accessToken: destinationToken.value },
        pending?.calendarId ?? plan.calendarId,
        eventId,
      );
      if (Result.isError(removed) && !isGone(removed.error))
        throwDomain(
          new ConflictError({
            message: "取り消された予定の移行先コピーを削除できませんでした。移動を再開してください",
          }),
        );
      if (pending !== undefined) {
        await ctx.runMutation(internal.mutations.calendarSync.recordOutputMove.recordOutputMove, {
          ownerId,
          generation: plan.generation,
          linkId: link._id,
          pendingMove: undefined,
        });
        pending = undefined;
      }
    }
    if (pending === undefined && desired !== null) {
      if (link.calendarId === plan.calendarId) {
        pending = {
          connectionId: plan.connectionId,
          calendarId: plan.calendarId,
          googleEventId: link.googleEventId,
          googleUpdated: link.googleUpdated ?? "",
          payloadKey: link.payloadKey ?? payloadKey(desired),
        };
      } else {
        const created = await insertEvent(
          { accessToken: destinationToken.value },
          plan.calendarId,
          desired,
          await outputMoveEventId(link._id, plan.generation),
        );
        if (Result.isError(created)) {
          if (isAuthFailure(created.error)) await markNeedsReauth(ctx, ownerId, plan.connectionId);
          else await markSyncError(ctx, ownerId, created.error.message, null, plan.connectionId);
          throwDomain(
            new ConflictError({
              message:
                "書き込み先の変更を完了できませんでした。もう一度同じカレンダーを選んで再試行してください",
            }),
          );
        }
        pending = {
          connectionId: plan.connectionId,
          calendarId: plan.calendarId,
          googleEventId: created.value.id,
          googleUpdated: created.value.updated ?? "",
          payloadKey: payloadKey(desired),
        };
      }
      const recorded = await ctx.runMutation(
        internal.mutations.calendarSync.recordOutputMove.recordOutputMove,
        { ownerId, generation: plan.generation, linkId: link._id, pendingMove: pending },
      );
      if (!recorded) {
        if (pending.googleEventId !== link.googleEventId || pending.calendarId !== link.calendarId)
          await deleteEvent(
            { accessToken: destinationToken.value },
            pending.calendarId,
            pending.googleEventId,
          );
        return "moving";
      }
    }
    if (
      pending === undefined ||
      pending.calendarId !== link.calendarId ||
      pending.googleEventId !== link.googleEventId
    ) {
      const token = await getGoogleAccessToken(ctx, {
        accountId: googleAccountId,
        userId: ownerId,
      });
      if (Result.isError(token)) {
        const outcome = await markTokenFailure(ctx, ownerId, token.error, sourceConnectionId);
        throwDomain(
          new ValidationFailedError({
            message:
              outcome === "needsReauth"
                ? "以前の書き込み先の Google アカウントを再接続して、変更を再試行してください"
                : "Google との通信に失敗しました。少し待って移動を再開してください",
          }),
        );
      }
      const deleted = await deleteEvent(
        { accessToken: token.value },
        link.calendarId,
        link.googleEventId,
      );
      if (Result.isError(deleted) && !isGone(deleted.error)) {
        if (isAuthFailure(deleted.error)) await markNeedsReauth(ctx, ownerId, sourceConnectionId);
        else await markSyncError(ctx, ownerId, deleted.error.message, null, sourceConnectionId);
        throwDomain(
          new ConflictError({
            message:
              "以前のカレンダーの予定を削除できませんでした。書き込み先変更を再試行してください",
          }),
        );
      }
    }
    await ctx.runMutation(internal.mutations.calendarSync.finishOutputMove.finishOutputMove, {
      ownerId,
      generation: plan.generation,
      linkId: link._id,
    });
  }
  const finished = await ctx.runMutation(
    internal.mutations.calendarSync.finishOutputChange.finishOutputChange,
    { ownerId, generation: plan.generation },
  );
  if (finished) {
    await ctx.scheduler.runAfter(0, internal.actions.calendarSync.syncOwner.syncOwner, {
      ownerId,
      connectionId: plan.connectionId,
    });
    return "ok";
  }
  await ctx.scheduler.runAfter(0, internal.actions.calendarSync.continueOutput.continueOutput, {
    ownerId,
  });
  return "moving";
}

async function outputMoveEventId(
  linkId: Id<"calendarSyncLinks">,
  generation: number,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${linkId}:${String(generation)}`),
  );
  return `cairn${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
