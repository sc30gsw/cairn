"use node";

import { Result } from "better-result";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import {
  CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
  CALENDAR_SYNC_RETRY_DELAYS_MS,
} from "../../lib/calendarSync";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import { isAuthFailure, isRetryable } from "../../lib/googleCalendar";
import { calendarSyncSourceKindValidator } from "../../lib/validators";
import { pushOne } from "../../services/calendarSync/pushOne";

//? 目標・予定のミューテーションから積まれる差分送信。読み1回（pushPlan）→ Google → 書き1回（recordPush）。
//? 一時的な失敗は数回だけ退避して再試行し、権限切れは needsReauth にして止める（CVX-05/07）
export const pushSource = internalAction({
  args: {
    attempt: v.number(),
    ownerId: v.string(),
    sourceId: v.string(),
    sourceKind: calendarSyncSourceKindValidator,
  },
  handler: async (ctx, args) => {
    const plan = await ctx.runQuery(internal.queries.calendarSync.pushPlan.pushPlan, {
      ownerId: args.ownerId,
      sourceId: args.sourceId,
      sourceKind: args.sourceKind,
    });
    if (plan === null) {
      return null;
    }
    const token = await getGoogleAccessToken(ctx, {
      accountId: plan.accessAccountId,
      userId: args.ownerId,
    });
    if (Result.isError(token)) {
      await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
        lastError: CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
        ownerId: args.ownerId,
        status: "needsReauth",
        syncedAt: null,
      });
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
      await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
        lastError: CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
        ownerId: args.ownerId,
        status: "needsReauth",
        syncedAt: null,
      });
      return null;
    }
    const delay = CALENDAR_SYNC_RETRY_DELAYS_MS[args.attempt];
    if (isRetryable(pushed.error) && delay !== undefined) {
      await ctx.scheduler.runAfter(delay, internal.actions.calendarSync.pushSource.pushSource, {
        ...args,
        attempt: args.attempt + 1,
      });
      return null;
    }
    await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
      lastError: pushed.error.message,
      ownerId: args.ownerId,
      status: "error",
      syncedAt: null,
    });
    return null;
  },
  returns: v.null(),
});
