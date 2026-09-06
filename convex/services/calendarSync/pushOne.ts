import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import {
  deleteEvent,
  type GoogleCalendarClient,
  GoogleCalendarError,
  insertEvent,
  isGone,
  patchEvent,
} from "../../lib/googleCalendar";
import type { GoogleEventPayload, SyncSource } from "../../lib/validators";
import { patchPayload } from "./eventPayload";

type PushOneArgs = {
  calendarId: string;
  ownerId: string;
  source: SyncSource;
};

export async function pushOne(
  ctx: ActionCtx,
  client: GoogleCalendarClient,
  args: PushOneArgs,
): Promise<Result<"conflict" | "deleted" | "skipped" | "upserted", GoogleCalendarError>> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const plan = await ctx.runQuery(internal.queries.calendarSync.pushPlan.pushPlan, {
      ownerId: args.ownerId,
      sourceId: args.source.sourceId,
      sourceKind: args.source.sourceKind,
    });
    if (plan === null || plan.calendarId !== args.calendarId) return Result.ok("skipped");
    const result = await sendOne(ctx, client, { ...args, source: plan.source });
    if (Result.isError(result)) return result;
    if (result.value !== "changed") return Result.ok(result.value);
  }
  await ctx.scheduler.runAfter(0, internal.actions.calendarSync.pushSource.pushSource, {
    attempt: 0,
    ownerId: args.ownerId,
    sourceId: args.source.sourceId,
    sourceKind: args.source.sourceKind,
  });
  return Result.ok("conflict");
}

async function sendOne(
  ctx: ActionCtx,
  client: GoogleCalendarClient,
  args: PushOneArgs,
): Promise<
  Result<"changed" | "conflict" | "deleted" | "skipped" | "upserted", GoogleCalendarError>
> {
  const { calendarId, ownerId, source } = args;
  const base = {
    calendarId,
    expected: source.link,
    ownerId,
    sourceId: source.sourceId,
    sourceKind: source.sourceKind,
  };
  if (source.desired === null) {
    if (source.link === null) {
      return Result.ok("skipped");
    }
    const deleted = await deleteEvent(client, calendarId, source.link.googleEventId);
    if (Result.isError(deleted) && !isGone(deleted.error)) {
      return deleted;
    }
    const recorded = await ctx.runMutation(internal.mutations.calendarSync.recordPush.recordPush, {
      ...base,
      outcome: { kind: "deleted" },
    });
    return Result.ok(
      recorded === "recorded" ? "deleted" : recorded === "changed" ? "changed" : "conflict",
    );
  }
  const payloadKey = source.payloadKey ?? "";
  if (
    source.link !== null &&
    source.link.payloadKey === payloadKey &&
    source.link.appChangedAt === null
  ) {
    return Result.ok("skipped");
  }
  const upserted = await upsert(
    client,
    calendarId,
    source.link?.googleEventId ?? null,
    source.desired,
  );
  if (Result.isError(upserted)) {
    return upserted;
  }
  const recorded = await ctx.runMutation(internal.mutations.calendarSync.recordPush.recordPush, {
    ...base,
    outcome: {
      googleEventId: upserted.value.id,
      googleUpdated: upserted.value.updated ?? "",
      kind: "upserted",
      payloadKey,
    },
  });
  if (recorded === "changed") return Result.ok("changed");
  if (recorded !== "recorded") {
    if (createdNewGoogleEvent(source, upserted.value.id)) {
      await deleteEvent(client, calendarId, upserted.value.id);
    }
    return Result.ok("conflict");
  }
  return Result.ok("upserted");
}

function createdNewGoogleEvent(source: SyncSource, googleEventId: string): boolean {
  return source.link === null || source.link.googleEventId !== googleEventId;
}

async function upsert(
  client: GoogleCalendarClient,
  calendarId: string,
  googleEventId: string | null,
  desired: GoogleEventPayload,
) {
  if (googleEventId !== null) {
    const patched = await patchEvent(client, calendarId, googleEventId, patchPayload(desired));
    if (Result.isOk(patched) || !isGone(patched.error)) {
      return patched;
    }
  }
  return insertEvent(client, calendarId, desired);
}
