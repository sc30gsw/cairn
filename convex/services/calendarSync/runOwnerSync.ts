import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { CALENDAR_SYNC_FULL_RESYNC_DAYS } from "../../lib/calendarSync";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import {
  type GoogleCalendarClient,
  GoogleCalendarError,
  isAuthFailure,
} from "../../lib/googleCalendar";
import { daysUntil, todayJst } from "../../lib/jst";
import type { OwnerSyncOutcome } from "../../lib/validators";
import { applyPulledEventsInOrder } from "./applyPulledEventsInOrder";
import { calendarsToPull } from "./calendarsToPull";
import { pullCalendar } from "./pullCalendar";
import { pushOne } from "./pushOne";
import { markNeedsReauth, markSyncError } from "./syncFailure";
import { syncWindow } from "./window";

export async function runOwnerSync(ctx: ActionCtx, ownerId: string): Promise<OwnerSyncOutcome> {
  const today = todayJst();
  const plan = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    todayJst: today,
  });
  if (plan === null) {
    return "notConnected";
  }
  const token = await getGoogleAccessToken(ctx, {
    accountId: plan.googleAccountId,
    userId: ownerId,
  });
  if (Result.isError(token)) {
    await markNeedsReauth(ctx, ownerId);
    return "needsReauth";
  }
  const client: GoogleCalendarClient = { accessToken: token.value };
  const window = syncWindow(today);
  const failures: GoogleCalendarError[] = [];

  const cursorByCalendar = new Map(plan.cursors.map((entry) => [entry.calendarId, entry]));
  for (const calendarId of calendarsToPull(plan)) {
    const stored = cursorByCalendar.get(calendarId);
    const cursor =
      stored === undefined ||
      daysUntil(stored.fullSyncedOnJst, today) >= CALENDAR_SYNC_FULL_RESYNC_DAYS
        ? null
        : stored.syncToken;
    const pulled = await pullCalendar(client, { calendarId, syncToken: cursor, window });
    if (Result.isError(pulled)) {
      if (isAuthFailure(pulled.error)) {
        await markNeedsReauth(ctx, ownerId);
        return "needsReauth";
      }
      failures.push(pulled.error);
      continue;
    }
    await applyPulledEventsInOrder(ctx, {
      calendarId,
      events: pulled.value.events,
      finish: { keepEventIds: pulled.value.keepEventIds, syncToken: pulled.value.syncToken },
      ownerId,
      todayJst: today,
    });
  }

  const refreshed = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    todayJst: today,
  });
  if (refreshed === null) {
    return "notConnected";
  }
  for (const source of refreshed.sources) {
    const pushed = await pushOne(ctx, client, {
      calendarId: refreshed.calendarId,
      ownerId,
      source,
    });
    if (Result.isError(pushed)) {
      if (isAuthFailure(pushed.error)) {
        await markNeedsReauth(ctx, ownerId);
        return "needsReauth";
      }
      failures.push(pushed.error);
    }
  }

  const now = Date.now();
  if (failures.length > 0) {
    const [first] = failures;
    await markSyncError(ctx, ownerId, first?.message ?? "同期に失敗しました", now);
    return "error";
  }
  await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
    lastError: null,
    ownerId,
    status: "ok",
    syncedAt: now,
  });
  return "ok";
}
