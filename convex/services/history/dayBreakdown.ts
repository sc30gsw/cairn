import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { buildDayBreakdown, liveDayDatesFrom, liveRows } from "./shared";

export async function dayBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
) {
  const [rows, days, catalog] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", args.dateJst))
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", args.dateJst))
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const liveDay = days.find((day) => day.deletedAt === undefined);
  return buildDayBreakdown(
    args.dateJst,
    args.todayJst,
    liveRows(rows, liveDayDates),
    liveDayDates,
    catalog.itemById,
    catalog.categoryById,
    { [args.dateJst]: liveDay?.condition ?? null },
  );
}
