import type { MutationCtx } from "../../_generated/server";
import { overlapsWindow, syncWindow } from "./window";

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
  await Promise.all(
    externals.map(async (external) => {
      if (overlapsWindow(external, window) && (keep === null || keep.has(external.googleEventId))) {
        return;
      }
      const pending = await ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_calendar_and_event", (q) =>
          q
            .eq("ownerId", args.ownerId)
            .eq("calendarId", args.calendarId)
            .eq("googleEventId", external.googleEventId),
        )
        .unique();
      if (pending === null) {
        await ctx.db.delete("externalCalendarEvents", external._id);
      }
    }),
  );
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
