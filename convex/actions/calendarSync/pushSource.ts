"use node";

import { Result } from "better-result";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import { isAuthFailure, isRetryable } from "../../lib/googleCalendar";
import { calendarSyncSourceKindValidator } from "../../lib/validators";
import { withCalendarOperation } from "../../services/calendarSync/operation";
import { pushOne } from "../../services/calendarSync/pushOne";
import {
  markNeedsReauth,
  markSyncError,
  retryDelayMs,
} from "../../services/calendarSync/syncFailure";

export const pushSource = internalAction({
  args: {
    attempt: v.number(),
    ownerId: v.string(),
    sourceId: v.string(),
    sourceKind: calendarSyncSourceKindValidator,
  },
  handler: async (ctx, args) => {
    const operation = await withCalendarOperation(ctx, args.ownerId, async () => {
      const plan = await ctx.runQuery(internal.queries.calendarSync.pushPlan.pushPlan, {
        ownerId: args.ownerId,
        sourceId: args.sourceId,
        sourceKind: args.sourceKind,
      });
      if (plan === null) {
        return null;
      }
      const token = await getGoogleAccessToken(ctx, {
        accountId: plan.googleAccountId,
        userId: args.ownerId,
      });
      if (Result.isError(token)) {
        await markNeedsReauth(ctx, args.ownerId);
        return null;
      }
      const pushed = await pushOne(
        ctx,
        { accessToken: token.value },
        { calendarId: plan.calendarId, ownerId: args.ownerId, source: plan.source },
      );
      if (Result.isOk(pushed)) {
        return null;
      }
      if (isAuthFailure(pushed.error)) {
        await markNeedsReauth(ctx, args.ownerId);
        return null;
      }
      const delay = retryDelayMs(args.attempt);
      if (isRetryable(pushed.error) && delay !== undefined) {
        await ctx.scheduler.runAfter(delay, internal.actions.calendarSync.pushSource.pushSource, {
          ...args,
          attempt: args.attempt + 1,
        });
        return null;
      }
      await markSyncError(ctx, args.ownerId, pushed.error.message);
      return null;
    });
    if (!operation.acquired) {
      await ctx.scheduler.runAfter(5000, internal.actions.calendarSync.pushSource.pushSource, args);
    }
    return null;
  },
  returns: v.null(),
});
