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
  markTokenFailure,
  retryDelayMs,
} from "../../services/calendarSync/syncFailure";

export const pushSource = internalAction({
  args: {
    connectionId: v.optional(v.id("calendarConnections")),
    generation: v.optional(v.number()),
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
      if (
        plan === null ||
        (args.connectionId !== undefined && args.connectionId !== plan.connectionId) ||
        (args.generation ?? 0) !== plan.generation
      ) {
        return null;
      }
      const token = await getGoogleAccessToken(ctx, {
        accountId: plan.googleAccountId,
        userId: args.ownerId,
      });
      if (Result.isError(token)) {
        await markTokenFailure(ctx, args.ownerId, token.error, plan.connectionId);
        return null;
      }
      const pushed = await pushOne(
        ctx,
        { accessToken: token.value },
        {
          calendarId: plan.calendarId,
          connectionId: plan.connectionId,
          generation: plan.generation,
          ownerId: args.ownerId,
          source: plan.source,
        },
      );
      if (Result.isOk(pushed)) {
        return null;
      }
      if (isAuthFailure(pushed.error)) {
        await markNeedsReauth(ctx, args.ownerId, plan.connectionId);
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
      await markSyncError(ctx, args.ownerId, pushed.error.message, null, plan.connectionId);
      return null;
    });
    if (!operation.acquired) {
      await ctx.scheduler.runAfter(5000, internal.actions.calendarSync.pushSource.pushSource, args);
    }
    return null;
  },
  returns: v.null(),
});
