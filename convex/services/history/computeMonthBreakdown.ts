import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { aggregateBreakdownRows, aggregateByCondition } from "../../lib/historyBreakdown";
import { calendarDatesInMonth } from "../../lib/jst";
import { addDaysJst } from "../../lib/jst";
import { buildConditionByDate, buildHeatmapDays, buildMinutesByDate } from "./heatmapDays";
import { liveDayDatesFrom, liveRows } from "./liveRows";
import { rowsToHistoryEvents } from "./rowToHistoryEvent";

export async function computeMonthBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; yearMonth: string },
) {
  const dates = calendarDatesInMonth(args.yearMonth);
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (start === undefined || end === undefined) {
    return {
      byCategory: [],
      byCondition: [],
      confirmedMinutes: 0,
      days: [],
      events: [],
      rows: [],
      skippedMinutes: 0,
    };
  }
  const lookbackStart = addDaysJst(start, -6);
  const [rows, days, catalog] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const monthLiveDayDates = new Set(
    [...liveDayDates].filter((dateJst) => dateJst >= start && dateJst <= end),
  );
  const liveRowsInMonth = liveRows(
    rows.filter((row) => row.dateJst >= start && row.dateJst <= end),
    monthLiveDayDates,
  );
  const aggregated = aggregateBreakdownRows(
    liveRowsInMonth,
    catalog.itemById,
    catalog.categoryById,
  );
  const events = rowsToHistoryEvents(liveRowsInMonth, catalog);
  const minutesByDate = buildMinutesByDate(rows, liveDayDates);
  const conditionByDate = buildConditionByDate(days);
  return {
    byCategory: aggregated.byCategory,
    byCondition: aggregateByCondition(liveRowsInMonth, conditionByDate),
    confirmedMinutes: aggregated.confirmedMinutes,
    days: buildHeatmapDays(dates, args.todayJst, liveDayDates, minutesByDate, conditionByDate),
    events,
    rows: aggregated.rows,
    skippedMinutes: aggregated.skippedMinutes,
  };
}
