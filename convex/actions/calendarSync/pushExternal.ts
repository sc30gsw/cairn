"use node";

import { Result } from "better-result";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import {
  deleteEvent,
  isAuthFailure,
  isGone,
  isRetryable,
  patchEvent,
} from "../../lib/googleCalendar";
import { externalChangeValidator } from "../../lib/validators";
import { externalChangePayload } from "../../services/calendarSync/eventPayload";
import { markNeedsReauth, retryDelayMs } from "../../services/calendarSync/syncFailure";

//? 外部予定へのアプリ側の操作（移動 / 削除）を Google に反映する。写しはミューテーションで先に動いている。
//? 一時的な失敗は再試行し、諦めたらそのカレンダーの差分トークンを捨てて次の同期で写しを Google に合わせる
export const pushExternal = internalAction({
  args: {
    attempt: v.number(),
    calendarId: v.string(),
    change: externalChangeValidator,
    googleEventId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await ctx.runQuery(
      internal.queries.calendarSync.connectionAccess.connectionAccess,
      { ownerId: args.ownerId },
    );
    if (access === null) {
      return null;
    }
    const token = await getGoogleAccessToken(ctx, {
      accountId: access.googleAccountId,
      userId: args.ownerId,
    });
    if (Result.isError(token)) {
      await markNeedsReauth(ctx, args.ownerId);
      return null;
    }
    const client = { accessToken: token.value };
    const outcome =
      args.change.kind === "delete"
        ? await deleteEvent(client, args.calendarId, args.googleEventId)
        : await patchEvent(
            client,
            args.calendarId,
            args.googleEventId,
            externalChangePayload(args.change),
          );
    if (Result.isOk(outcome) || isGone(outcome.error)) {
      return null;
    }
    if (isAuthFailure(outcome.error)) {
      await markNeedsReauth(ctx, args.ownerId);
      return null;
    }
    const delay = retryDelayMs(args.attempt);
    if (isRetryable(outcome.error) && delay !== undefined) {
      await ctx.scheduler.runAfter(delay, internal.actions.calendarSync.pushExternal.pushExternal, {
        ...args,
        attempt: args.attempt + 1,
      });
      return null;
    }
    await ctx.runMutation(internal.mutations.calendarSync.abandonExternalPush.abandonExternalPush, {
      calendarId: args.calendarId,
      lastError: outcome.error.message,
      ownerId: args.ownerId,
    });
    return null;
  },
  returns: v.null(),
});
