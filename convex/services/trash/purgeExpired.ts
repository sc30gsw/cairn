import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { deleteRowsByIds, isPurgeDue, TRASH_TTL_MS } from "../../lib/trash";

export async function purgeExpired(ctx: MutationCtx, args: { now?: number } = {}): Promise<null> {
  const now = args.now ?? Date.now();
  const cutoff = now - TRASH_TTL_MS;
  const [expiredDays, expiredRows] = await Promise.all([
    ctx.db
      .query("days")
      .withIndex("by_deletedAt", (q) => q.lte("deletedAt", cutoff))
      .collect(),
    ctx.db
      .query("rows")
      .withIndex("by_deletedAt", (q) => q.lte("deletedAt", cutoff))
      .collect(),
  ]);
  const expiredDayIds = expiredDays.flatMap((day) =>
    day.deletedAt !== undefined && isPurgeDue(day.deletedAt, now) ? [day._id] : [],
  );
  const rowIds = new Set<Id<"rows">>();
  const childRows = await Promise.all(
    expiredDayIds.map((dayId) =>
      ctx.db
        .query("rows")
        .withIndex("by_day", (q) => q.eq("dayId", dayId))
        .collect(),
    ),
  );
  for (const rows of childRows) {
    for (const row of rows) {
      rowIds.add(row._id);
    }
  }
  for (const row of expiredRows) {
    if (row.deletedAt !== undefined && isPurgeDue(row.deletedAt, now)) {
      rowIds.add(row._id);
    }
  }
  const purgedDayIds = new Set(expiredDayIds);
  await deleteRowsByIds(ctx, rowIds);
  await Promise.all(
    [...purgedDayIds].map(async (dayId) => {
      const day = await ctx.db.get("days", dayId);
      if (day !== null) {
        await ctx.db.delete("days", dayId);
      }
    }),
  );
  return null;
}
