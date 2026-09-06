import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { CALENDAR_SYNC_FULL_RESYNC_DAYS } from "../../lib/calendarSync";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import {
  type GoogleCalendarClient,
  GoogleCalendarError,
  isAuthFailure,
} from "../../lib/googleCalendar";
import { daysUntil, todayJst } from "../../lib/jst";
import type { OwnerSyncOutcome, SyncSource } from "../../lib/validators";
import { applyPulledEventsInOrder } from "./applyPulledEventsInOrder";
import { calendarsToPull } from "./calendarsToPull";
import { withCalendarOperation } from "./operation";
import { pullCalendar } from "./pullCalendar";
import { flushExternalChanges } from "./pushExternalChange";
import { pushOne } from "./pushOne";
import { markNeedsReauth, markSyncError, markTokenFailure } from "./syncFailure";
import { syncWindow } from "./window";

export async function runOwnerSync(
  ctx: ActionCtx,
  ownerId: string,
  connectionId?: Id<"calendarConnections">,
): Promise<OwnerSyncOutcome> {
  if (connectionId !== undefined) {
    const operation = await withCalendarOperation(
      ctx,
      ownerId,
      () => syncConnectedOwner(ctx, ownerId, connectionId),
      connectionId,
    );
    return operation.acquired ? operation.value : "busy";
  }
  let cursor: string | null = null;
  let result: OwnerSyncOutcome = "notConnected";
  while (true) {
    const page: { page: Id<"calendarConnections">[]; isDone: boolean; continueCursor: string } =
      await ctx.runQuery(internal.queries.calendarSync.connectionsForOwner.connectionsForOwner, {
        ownerId,
        paginationOpts: { cursor, numItems: 25 },
      });
    const outcomes = await Promise.all(page.page.map((id) => runOwnerSync(ctx, ownerId, id)));
    for (const outcome of outcomes) {
      if (result === "notConnected" || result === "ok" || outcome === "error") result = outcome;
    }
    if (page.isDone) return result;
    cursor = page.continueCursor;
  }
}

export async function syncConnectedOwner(
  ctx: ActionCtx,
  ownerId: string,
  connectionId?: Id<"calendarConnections">,
): Promise<OwnerSyncOutcome> {
  const today = todayJst();
  const plan = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    connectionId,
    todayJst: today,
    includeSources: false,
  });
  if (plan === null) {
    return "notConnected";
  }
  if (plan.disconnecting) return "error";
  const token = await getGoogleAccessToken(ctx, {
    accountId: plan.googleAccountId,
    userId: ownerId,
  });
  if (Result.isError(token)) {
    return markTokenFailure(ctx, ownerId, token.error, connectionId);
  }
  const client: GoogleCalendarClient = { accessToken: token.value };
  const window = syncWindow(today);
  const failures: GoogleCalendarError[] = [];
  const flushed = await flushExternalChanges(ctx, client, ownerId, plan.connectionId);
  if (Result.isError(flushed)) {
    if (isAuthFailure(flushed.error)) {
      await markNeedsReauth(ctx, ownerId, connectionId);
      return "needsReauth";
    }
    failures.push(flushed.error);
  }

  const pullPlan = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    connectionId,
    todayJst: today,
    includeSources: false,
  });
  if (pullPlan === null) return "notConnected";
  const cursorByCalendar = new Map(pullPlan.cursors.map((entry) => [entry.calendarId, entry]));
  for (const calendarId of calendarsToPull(pullPlan)) {
    const stored = cursorByCalendar.get(calendarId);
    const cursor =
      stored === undefined ||
      daysUntil(stored.fullSyncedOnJst, today) >= CALENDAR_SYNC_FULL_RESYNC_DAYS
        ? null
        : stored.syncToken;
    const linkedEventIds: string[] = [];
    if (pullPlan.isOutput && calendarId === pullPlan.calendarId) {
      let linkCursor: string | null = null;
      while (true) {
        const page: { page: Doc<"calendarSyncLinks">[]; isDone: boolean; continueCursor: string } =
          await ctx.runQuery(internal.queries.calendarSync.linkedPage.linkedPage, {
            ownerId,
            connectionId: pullPlan.connectionId,
            calendarId,
            paginationOpts: { cursor: linkCursor, numItems: 100 },
          });
        linkedEventIds.push(...page.page.map((link) => link.googleEventId));
        if (page.isDone) break;
        linkCursor = page.continueCursor;
      }
    }
    const pulled = await pullCalendar(client, {
      calendarId,
      linkedEventIds,
      syncToken: cursor,
      window,
    });
    if (Result.isError(pulled)) {
      if (isAuthFailure(pulled.error)) {
        await markNeedsReauth(ctx, ownerId, connectionId);
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
      connectionId,
      todayJst: today,
      generation: pullPlan.generation,
    });
  }

  const refreshed = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    connectionId,
    todayJst: today,
    includeSources: false,
  });
  if (refreshed === null) {
    return "notConnected";
  }
  for (const phase of ["goals", "blocks", "links"] as const) {
    let sourceCursor: string | null = null;
    while (refreshed.isOutput) {
      const page: { page: SyncSource[]; isDone: boolean; continueCursor: string } =
        await ctx.runQuery(internal.queries.calendarSync.sourcePage.sourcePage, {
          ownerId,
          connectionId: refreshed.connectionId,
          todayJst: today,
          phase,
          paginationOpts: { cursor: sourceCursor, numItems: 50 },
        });
      for (const source of page.page) {
        const pushed = await pushOne(ctx, client, {
          calendarId: refreshed.calendarId,
          generation: refreshed.generation,
          ownerId,
          connectionId: refreshed.connectionId,
          source,
        });
        if (Result.isError(pushed)) {
          if (isAuthFailure(pushed.error)) {
            await markNeedsReauth(ctx, ownerId, connectionId);
            return "needsReauth";
          }
          failures.push(pushed.error);
        }
      }
      if (page.isDone) break;
      sourceCursor = page.continueCursor;
    }
  }

  const now = Date.now();
  if (failures.length > 0) {
    const [first] = failures;
    await markSyncError(ctx, ownerId, first?.message ?? "同期に失敗しました", now, connectionId);
    return "error";
  }
  await ctx.runMutation(internal.mutations.calendarSync.markStatus.markStatus, {
    lastError: null,
    ownerId,
    connectionId,
    status: "ok",
    syncedAt: now,
  });
  return "ok";
}
