import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isPurgeDue(deletedAt: number, now: number): boolean {
  return now - deletedAt >= TRASH_TTL_MS;
}

async function deleteScheduleEventsForRow(ctx: MutationCtx, rowId: Id<"rows">) {
  const blocks = await ctx.db
    .query("boardScheduleEvents")
    .withIndex("by_row", (q) => q.eq("rowId", rowId))
    .collect();
  await Promise.all(blocks.map((block) => ctx.db.delete("boardScheduleEvents", block._id)));
}

export async function deleteRowsByIds(ctx: MutationCtx, rowIds: Iterable<Id<"rows">>) {
  const ids = [...rowIds];
  await Promise.all(ids.map((id) => deleteScheduleEventsForRow(ctx, id)));
  await Promise.all(ids.map((id) => ctx.db.delete("rows", id)));
}

export async function deleteDayAndRows(ctx: MutationCtx, dayId: Id<"days">) {
  const rows = await ctx.db
    .query("rows")
    .withIndex("by_day", (q) => q.eq("dayId", dayId))
    .collect();
  await deleteRowsByIds(
    ctx,
    rows.map((row) => row._id),
  );
  await ctx.db.delete("days", dayId);
}
