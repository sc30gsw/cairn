import type { MutationCtx } from "../../_generated/server";

const BATCH_SIZE = 100;

export async function clearSyncStateBatch(ctx: MutationCtx, ownerId: string): Promise<boolean> {
  const [links, externals, cursors, changes] = await Promise.all([
    ctx.db
      .query("calendarSyncLinks")
      .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", ownerId))
      .take(BATCH_SIZE),
    ctx.db
      .query("externalCalendarEvents")
      .withIndex("by_owner_and_startAt", (q) => q.eq("ownerId", ownerId))
      .take(BATCH_SIZE),
    ctx.db
      .query("calendarSyncCursors")
      .withIndex("by_owner_and_calendar", (q) => q.eq("ownerId", ownerId))
      .take(BATCH_SIZE),
    ctx.db
      .query("calendarExternalChanges")
      .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", ownerId))
      .take(BATCH_SIZE),
  ]);
  await Promise.all([
    ...changes.map((change) => ctx.db.delete("calendarExternalChanges", change._id)),
    ...links.map((link) => ctx.db.delete("calendarSyncLinks", link._id)),
    ...externals.map((external) => ctx.db.delete("externalCalendarEvents", external._id)),
    ...cursors.map((cursor) => ctx.db.delete("calendarSyncCursors", cursor._id)),
  ]);
  return [links, externals, cursors, changes].every((batch) => batch.length < BATCH_SIZE);
}
