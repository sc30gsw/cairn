import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireYearMonth } from "../../lib/dateArgs";
import { YEAR_MONTH_MESSAGE } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { aggregateBreakdownRows } from "../../lib/historyBreakdown";
import { addMonthsJst, calendarDatesInMonth } from "../../lib/jst";
import { buildMonthlyDigestTrend } from "../../lib/monthlyReview";
import { throwDomain } from "../../lib/ownerFunctions";
import type { MonthlyReviewDto } from "../../lib/validators";
import { buildDigest, elapsedDaysInRange } from "../../lib/weeklyReview";
import { liveDayDatesFrom, liveRows } from "../history/shared";

function yearMonthOf(dateJst: string): string {
  return dateJst.slice(0, 7);
}

export async function monthlyReview(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; yearMonth: string },
): Promise<MonthlyReviewDto> {
  //? 壊れた月は throw（日・週の引数と同じ規則。dateArgs.ts のコメント参照）
  const dates = calendarDatesInMonth(requireYearMonth(args.yearMonth));
  const start = dates[0];
  const end = dates.at(-1);
  if (start === undefined || end === undefined) {
    throwDomain(new ValidationFailedError({ message: YEAR_MONTH_MESSAGE }));
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
    digest: buildDigest(dates, statusRows, args.todayJst),
    digestTrend: buildMonthlyDigestTrend(dates, statusRows, args.todayJst),
    elapsedDays: elapsedDaysInRange(dates, args.todayJst),
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
