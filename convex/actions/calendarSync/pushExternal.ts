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
import {
  deleteEvent,
  isAuthFailure,
  isGone,
  isRetryable,
  patchEvent,
} from "../../lib/googleCalendar";
import { addDaysJst } from "../../lib/jst";
import { externalChangeValidator } from "../../lib/validators";
import { scheduleInstantToRfc3339 } from "../../services/calendarSync/instant";

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
      accountId: access.accessAccountId,
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
    const client = { accessToken: token.value };
    const outcome =
      args.change.kind === "delete"
        ? await deleteEvent(client, args.calendarId, args.googleEventId)
        : await patchEvent(client, args.calendarId, args.googleEventId, {
            end: args.change.allDay
              ? { date: addDaysJst(args.change.endAt.slice(0, 10), 1) }
              : { dateTime: scheduleInstantToRfc3339(args.change.endAt) },
            start: args.change.allDay
              ? { date: args.change.startAt.slice(0, 10) }
              : { dateTime: scheduleInstantToRfc3339(args.change.startAt) },
          });
    if (Result.isOk(outcome) || isGone(outcome.error)) {
      return null;
    }
    if (isAuthFailure(outcome.error)) {
      await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
        lastError: CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
        ownerId: args.ownerId,
        status: "needsReauth",
        syncedAt: null,
      });
      return null;
    }
    const delay = CALENDAR_SYNC_RETRY_DELAYS_MS[args.attempt];
    if (isRetryable(outcome.error) && delay !== undefined) {
      await ctx.scheduler.runAfter(delay, internal.actions.calendarSync.pushExternal.pushExternal, {
        ...args,
        attempt: args.attempt + 1,
      });
      return null;
    }
    await ctx.runMutation(internal.mutations.calendarSync.resetCalendarCursor.resetCalendarCursor, {
      calendarId: args.calendarId,
      ownerId: args.ownerId,
    });
    await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
      lastError: outcome.error.message,
      ownerId: args.ownerId,
      status: "error",
      syncedAt: null,
    });
    return null;
  },
  returns: v.null(),
});
