import type { MutationCtx } from "../../_generated/server";
import { isWithinWindow, syncWindow } from "./window";

//? 1カレンダー分の取り込みの締め: 差分トークンを保存し、全件取得なら「もう無い予定」の写しを消す。
//? どちらの場合も期間から外れた写しは捨てる
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
    .withIndex("by_owner_and_startAt", (q) => q.eq("ownerId", args.ownerId))
    .collect();
  const deletions: Promise<void>[] = [];
  for (const external of externals) {
    if (external.calendarId !== args.calendarId) {
      continue;
    }
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
  if (cursor === null) {
    await ctx.db.insert("calendarSyncCursors", {
      calendarId: args.calendarId,
      ownerId: args.ownerId,
      syncToken: args.syncToken,
    });
    return null;
  }
  await ctx.db.patch("calendarSyncCursors", cursor._id, { syncToken: args.syncToken });
  return null;
}
