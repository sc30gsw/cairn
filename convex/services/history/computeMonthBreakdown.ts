import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireYearMonth } from "../../lib/dateArgs";
import { YEAR_MONTH_MESSAGE } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { aggregateBreakdownRows, aggregateByCondition } from "../../lib/historyBreakdown";
import { addDaysJst, calendarDatesInMonth } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import {
  buildConditionByDate,
  buildHeatmapDays,
  buildMemoByDate,
  buildMinutesByDate,
} from "./heatmapDays";
import { liveDayDatesFrom, liveRows } from "./liveRows";
import { rowsToHistoryEvents } from "./rowToHistoryEvent";

export async function computeMonthBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; yearMonth: string },
) {
  //? 壊れた月は throw（日・週の引数と同じ規則。dateArgs.ts のコメント参照）
  const dates = calendarDatesInMonth(requireYearMonth(args.yearMonth));
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (start === undefined || end === undefined) {
    throwDomain(new ValidationFailedError({ message: YEAR_MONTH_MESSAGE }));
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
  const memoByDate = buildMemoByDate(days);
  return {
    byCategory: aggregated.byCategory,
    byCondition: aggregateByCondition(liveRowsInMonth, conditionByDate),
    confirmedMinutes: aggregated.confirmedMinutes,
    days: buildHeatmapDays(
      dates,
      args.todayJst,
      liveDayDates,
      minutesByDate,
      conditionByDate,
      memoByDate,
    ),
    events,
    rows: aggregated.rows,
    skippedMinutes: aggregated.skippedMinutes,
  };
}
