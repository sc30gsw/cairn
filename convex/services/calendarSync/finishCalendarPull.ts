import type { MutationCtx } from "../../_generated/server";
import { isWithinWindow, syncWindow } from "./window";

export async function finishCalendarPull(
  ctx: MutationCtx,
  args: {
    calendarId: string;
    keepEventIds: readonly string[] | null;
    ownerId: string;
    syncToken: string | null;
    todayJst: string;
  },
): Promise<null> {
  const window = syncWindow(args.todayJst);
  const keep = args.keepEventIds === null ? null : new Set(args.keepEventIds);
  const externals = await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q.eq("ownerId", args.ownerId).eq("calendarId", args.calendarId),
    )
    .collect();
  const deletions: Promise<void>[] = [];
  for (const external of externals) {
    const stale =
      !isWithinWindow(external.startAt, window) ||
      (keep !== null && !keep.has(external.googleEventId));
    if (stale) {
      deletions.push(ctx.db.delete("externalCalendarEvents", external._id));
    }
  }
  await Promise.all(deletions);
  const cursor = await ctx.db
    .query("calendarSyncCursors")
    .withIndex("by_owner_and_calendar", (q) =>
      q.eq("ownerId", args.ownerId).eq("calendarId", args.calendarId),
    )
    .unique();
  if (args.syncToken === null) {
    if (cursor !== null) {
      await ctx.db.delete("calendarSyncCursors", cursor._id);
    }
    return null;
  }
  const fullSyncedOnJst =
    args.keepEventIds !== null || cursor === null ? args.todayJst : cursor.fullSyncedOnJst;
  if (cursor === null) {
    await ctx.db.insert("calendarSyncCursors", {
      calendarId: args.calendarId,
      fullSyncedOnJst,
      ownerId: args.ownerId,
      syncToken: args.syncToken,
    });
    return null;
  }
  await ctx.db.patch("calendarSyncCursors", cursor._id, {
    fullSyncedOnJst,
    syncToken: args.syncToken,
  });
  return null;
}
