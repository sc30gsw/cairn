import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isPurgeDue(deletedAt: number, now: number): boolean {
  return now - deletedAt >= TRASH_TTL_MS;
}

export async function deleteRowsByIds(ctx: MutationCtx, rowIds: Iterable<Id<"rows">>) {
  await Promise.all([...rowIds].map((id) => ctx.db.delete(id)));
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
  await ctx.db.delete(dayId);
}
