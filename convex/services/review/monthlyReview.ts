import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { aggregateBreakdownRows } from "../../lib/historyBreakdown";
import { addMonthsJst, calendarDatesInMonth } from "../../lib/jst";
import { buildMonthlyDigestTrend } from "../../lib/monthlyReview";
import type { MonthlyReviewDto } from "../../lib/validators";
import { buildWeeklyDigest, elapsedDaysInWeek } from "../../lib/weeklyReview";
import { liveDayDatesFrom, liveRows } from "../history/shared";

function yearMonthOf(dateJst: string): string {
  return dateJst.slice(0, 7);
}

function emptyMonthlyReview(yearMonth: string, todayJst: string): MonthlyReviewDto {
  return {
    activeDays: 0,
    byCategory: [],
    confirmedMinutes: 0,
    digest: {
      confirmedCount: 0,
      countedFrom: yearMonth,
      countedThrough: null,
      digestRate: 0,
      isPartial: true,
      leftoverCount: 0,
      ongoingCount: 0,
      plannedCount: 0,
      skippedCount: 0,
    },
    digestTrend: [],
    elapsedDays: 0,
    isCurrentMonth: yearMonth === yearMonthOf(todayJst),
    monthEnd: yearMonth,
    monthStart: yearMonth,
    previousActiveDays: 0,
    previousByCategory: [],
    previousConfirmedMinutes: 0,
    previousYearMonth: yearMonth,
    skippedMinutes: 0,
    yearMonth,
  };
}

export async function monthlyReview(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; yearMonth: string },
): Promise<MonthlyReviewDto> {
  const dates = calendarDatesInMonth(args.yearMonth);
  const start = dates[0];
  const end = dates.at(-1);
  if (start === undefined || end === undefined) {
    return emptyMonthlyReview(args.yearMonth, args.todayJst);
  }

  const previousYearMonth = addMonthsJst(args.yearMonth, -1);
  const previousDates = calendarDatesInMonth(previousYearMonth);
  const previousStart = previousDates[0] ?? start;
  const previousEnd = previousDates.at(-1) ?? end;

  const [rows, days, catalog] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", previousStart).lte("dateJst", end),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", previousStart).lte("dateJst", end),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);

  const live = liveRows(rows, liveDayDatesFrom(days));
  const currentRows = live.filter((row) => row.dateJst >= start && row.dateJst <= end);
  const previousRows = live.filter(
    (row) => row.dateJst >= previousStart && row.dateJst <= previousEnd,
  );

  const current = aggregateBreakdownRows(currentRows, catalog.itemById, catalog.categoryById);
  const previous = aggregateBreakdownRows(previousRows, catalog.itemById, catalog.categoryById);

  const activeDaysOf = (targetRows: readonly (typeof live)[number][]) => {
    const activeDates = new Set<string>();
    for (const row of targetRows) {
      if (row.status === "確定") {
        activeDates.add(row.dateJst);
      }
    }
    return activeDates.size;
  };

  const statusRows = currentRows.map((row) => ({
    dateJst: row.dateJst,
    minutes: row.minutes,
    status: row.status,
  }));

  return {
    activeDays: activeDaysOf(currentRows),
    byCategory: current.byCategory,
    confirmedMinutes: current.confirmedMinutes,
    digest: buildWeeklyDigest(dates, statusRows, args.todayJst),
    digestTrend: buildMonthlyDigestTrend(dates, statusRows, args.todayJst),
    elapsedDays: elapsedDaysInWeek(dates, args.todayJst),
    isCurrentMonth: args.yearMonth === yearMonthOf(args.todayJst),
    monthEnd: end,
    monthStart: start,
    previousActiveDays: activeDaysOf(previousRows),
    previousByCategory: previous.byCategory,
    previousConfirmedMinutes: previous.confirmedMinutes,
    previousYearMonth,
    skippedMinutes: current.skippedMinutes,
    yearMonth: args.yearMonth,
  };
}
