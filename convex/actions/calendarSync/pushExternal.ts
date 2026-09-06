"use node";

import { Result } from "better-result";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction, type ActionCtx } from "../../_generated/server";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import { isAuthFailure, isRetryable } from "../../lib/googleCalendar";
import { withCalendarOperation } from "../../services/calendarSync/operation";
import { pushExternalChange } from "../../services/calendarSync/pushExternalChange";
import { markNeedsReauth, retryDelayMs } from "../../services/calendarSync/syncFailure";

async function pushPendingChange(
  ctx: ActionCtx,
  args: { attempt: number; ownerId: string; pendingId: Id<"calendarExternalChanges"> },
): Promise<void> {
  const access = await ctx.runQuery(
    internal.queries.calendarSync.connectionAccess.connectionAccess,
    { ownerId: args.ownerId },
  );
  if (access === null) {
    return;
  }
  const token = await getGoogleAccessToken(ctx, {
    accountId: access.googleAccountId,
    userId: args.ownerId,
  });
  if (Result.isError(token)) {
    await markNeedsReauth(ctx, args.ownerId);
    return;
  }
  const client = { accessToken: token.value };
  const outcome = await pushExternalChange(ctx, client, args.pendingId);
  if (Result.isOk(outcome)) {
    return;
  }
  if (isAuthFailure(outcome.error)) {
    await markNeedsReauth(ctx, args.ownerId);
    return;
  }
  const delay = retryDelayMs(args.attempt);
  if (isRetryable(outcome.error) && delay !== undefined) {
    await ctx.scheduler.runAfter(delay, internal.actions.calendarSync.pushExternal.pushExternal, {
      attempt: args.attempt + 1,
      pendingId: args.pendingId,
    });
    return;
  }
  await ctx.runMutation(internal.mutations.calendarSync.finishExternalPush.finishExternalPush, {
    pendingId: args.pendingId,
    lastError: outcome.error.message,
  });
}

export const pushExternal = internalAction({
  args: { attempt: v.number(), pendingId: v.id("calendarExternalChanges") },
  handler: async (ctx, args) => {
    const pending = await ctx.runQuery(
      internal.queries.calendarSync.pendingExternalChange.pendingExternalChange,
      { pendingId: args.pendingId },
    );
    if (pending === null) {
      return null;
    }
    const operation = await withCalendarOperation(ctx, pending.ownerId, async () =>
      pushPendingChange(ctx, { ...args, ownerId: pending.ownerId }),
    );
    if (!operation.acquired) {
      await ctx.scheduler.runAfter(
        5_000,
        internal.actions.calendarSync.pushExternal.pushExternal,
        args,
      );
    }
    return null;
  },
  returns: v.null(),
});
