import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { SyncPlan, SyncSource } from "../../lib/validators";
import { getConnection, getOutput } from "./getConnection";
import { syncSource } from "./syncSource";
import { syncWindow } from "./window";

export async function syncPlan(
  ctx: QueryCtx,
  args: {
    includeSources?: boolean;
    connectionId?: Id<"calendarConnections">;
    ownerId: string;
    todayJst: string;
  },
): Promise<SyncPlan> {
  const connection = await getConnection(ctx, args.ownerId, args.connectionId);
  if (connection === null) {
    return null;
  }
  const [output, legacy] = await Promise.all([
    getOutput(ctx, args.ownerId),
    getConnection(ctx, args.ownerId),
  ]);
  const isOutput = output?.connection._id === connection._id && !output.changing;
  const window = syncWindow(args.todayJst);
  const [goals, blocks, links, cursors] = await Promise.all([
    args.includeSources === false
      ? []
      : ctx.db
          .query("goals")
          .withIndex("by_owner_and_type", (q) => q.eq("ownerId", args.ownerId))
          .collect(),
    args.includeSources === false
      ? []
      : ctx.db
          .query("boardScheduleEvents")
          .withIndex("by_owner_and_startAt", (q) =>
            q
              .eq("ownerId", args.ownerId)
              .gte("startAt", window.startAtMin)
              .lt("startAt", window.startAtMaxExclusive),
          )
          .collect(),
    args.includeSources === false
      ? []
      : ctx.db
          .query("calendarSyncLinks")
          .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", args.ownerId))
          .collect(),
    ctx.db
      .query("calendarSyncCursors")
      .withIndex("by_owner_and_calendar", (q) => q.eq("ownerId", args.ownerId))
      .collect(),
  ]);
  const linkBySource = new Map<string, Doc<"calendarSyncLinks">>();
  for (const link of links.filter(
    (link) => (link.connectionId ?? legacy?._id) === connection._id,
  )) {
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
  for (const link of links.filter(
    (link) => (link.connectionId ?? legacy?._id) === connection._id,
  )) {
    const key = `${link.sourceKind}:${link.sourceId}`;
    if (seen.has(key)) {
      continue;
    }
    pending.push(syncSource(ctx, args.ownerId, link.sourceKind, link.sourceId, link));
  }
  const sources = await Promise.all(pending);
  return {
    connectionId: connection._id,
    generation: output?.generation ?? 0,
    isOutput,
    googleAccountId: connection.googleAccountId,
    disconnecting: connection.disconnecting === true,
    calendarId: isOutput ? output.calendarId : connection.primaryCalendarId,
    cursors: cursors.flatMap((cursor) =>
      (cursor.connectionId ?? legacy?._id) === connection._id
        ? [
            {
              calendarId: cursor.calendarId,
              fullSyncedOnJst: cursor.fullSyncedOnJst,
              syncToken: cursor.syncToken,
            },
          ]
        : [],
    ),
    sources: isOutput ? sources : [],
    visibleCalendarIds: connection.visibleCalendarIds,
  };
}
