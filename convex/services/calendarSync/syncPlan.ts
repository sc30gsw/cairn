import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { SyncPlan, SyncSource } from "../../lib/validators";
import { getConnection } from "./getConnection";
import { syncSource } from "./syncSource";
import { syncWindow } from "./window";

export async function syncPlan(
  ctx: QueryCtx,
  args: { ownerId: string; todayJst: string },
): Promise<SyncPlan> {
  const connection = await getConnection(ctx, args.ownerId);
  if (connection === null) {
    return null;
  }
  const window = syncWindow(args.todayJst);
  const [goals, blocks, links, cursors] = await Promise.all([
    ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", args.ownerId))
      .collect(),
    ctx.db
      .query("boardScheduleEvents")
      .withIndex("by_owner_and_startAt", (q) =>
        q
          .eq("ownerId", args.ownerId)
          .gte("startAt", window.startAtMin)
          .lt("startAt", window.startAtMaxExclusive),
      )
      .collect(),
    ctx.db
      .query("calendarSyncLinks")
      .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", args.ownerId))
      .collect(),
    ctx.db
      .query("calendarSyncCursors")
      .withIndex("by_owner_and_calendar", (q) => q.eq("ownerId", args.ownerId))
      .collect(),
  ]);
  const linkBySource = new Map<string, Doc<"calendarSyncLinks">>();
  for (const link of links) {
    linkBySource.set(`${link.sourceKind}:${link.sourceId}`, link);
  }
  const pending: Promise<SyncSource>[] = [];
  const seen = new Set<string>();
  for (const goal of goals) {
    const key = `goal:${goal._id}`;
    seen.add(key);
    pending.push(syncSource(ctx, args.ownerId, "goal", goal._id, linkBySource.get(key) ?? null));
  }
  for (const block of blocks) {
    const key = `block:${block._id}`;
    seen.add(key);
    pending.push(syncSource(ctx, args.ownerId, "block", block._id, linkBySource.get(key) ?? null));
  }
  for (const link of links) {
    const key = `${link.sourceKind}:${link.sourceId}`;
    if (seen.has(key)) {
      continue;
    }
    pending.push(syncSource(ctx, args.ownerId, link.sourceKind, link.sourceId, link));
  }
  const sources = await Promise.all(pending);
  return {
    googleAccountId: connection.googleAccountId,
    calendarId: connection.primaryCalendarId,
    cursors: cursors.map((cursor) => ({
      calendarId: cursor.calendarId,
      fullSyncedOnJst: cursor.fullSyncedOnJst,
      syncToken: cursor.syncToken,
    })),
    sources,
    visibleCalendarIds: connection.visibleCalendarIds,
  };
}
