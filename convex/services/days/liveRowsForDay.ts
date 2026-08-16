import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function liveRowsForDay(
  ctx: QueryCtx | MutationCtx,
  dayId: Id<"days">,
): Promise<Doc<"rows">[]> {
  const rows = await ctx.db
    .query("rows")
    .withIndex("by_day", (q) => q.eq("dayId", dayId))
    .collect();
  return rows
    .filter((row) => row.deletedAt === undefined)
    .toSorted((left, right) => left.sortOrder - right.sortOrder);
}
