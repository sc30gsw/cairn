"use node";

import { Result } from "better-result";
import { parse } from "convex-helpers/validators";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction, type ActionCtx } from "../../_generated/server";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import { isAuthFailure } from "../../lib/googleCalendar";
import schema from "../../schema";
import { withCalendarOperation } from "../../services/calendarSync/operation";
import { pushExternalChange } from "../../services/calendarSync/pushExternalChange";
import { markNeedsReauth } from "../../services/calendarSync/syncFailure";

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
  const outcome = await pushExternalChange(ctx, client, args);
  if (Result.isOk(outcome)) {
    return;
  }
  if (isAuthFailure(outcome.error)) {
    await markNeedsReauth(ctx, args.ownerId);
    return;
  }
}

const pushExternalArgs = v.union(
  v.object({ attempt: v.number(), pendingId: v.id("calendarExternalChanges") }),
  schema.tables.calendarExternalChanges.validator.omit("settledAt").extend({ attempt: v.number() }),
);

export const pushExternal = internalAction({
  args: schema.tables.calendarExternalChanges.validator
    .omit("settledAt")
    .partial()
    .extend({
      attempt: v.number(),
      pendingId: v.optional(v.id("calendarExternalChanges")),
    }).fields,
  handler: async (ctx, input): Promise<null> => {
    const args = parse(pushExternalArgs, input);
    if (!("pendingId" in args)) {
      const { attempt: _attempt, ...change } = args;
      await ctx.runMutation(
        internal.mutations.calendarSync.adoptLegacyExternalChange.adoptLegacyExternalChange,
        change,
      );
      return null;
    }
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
