import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { getDayByDate } from "../days/getDayByDate";
import { buildDayBreakdown, liveRows } from "./shared";

export async function dayBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
) {
  const [rows, catalog, liveDay] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", args.dateJst))
      .collect(),
    loadCatalog(ctx, ownerId),
    getDayByDate(ctx, ownerId, args.dateJst),
  ]);
  const liveDayDates = liveDay === null ? new Set<string>() : new Set([args.dateJst]);
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
