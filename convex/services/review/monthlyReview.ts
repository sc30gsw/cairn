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

//? calendarDatesInMonth が空を返す(yearMonth の形式が壊れている)場合の防御。
//? computeMonthBreakdown の既存防御パターンに合わせる(月の引数は throw せず空 DTO を返す)。
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

//* 月次レビュー1画面ぶん。対象月+前月を1本のレンジ読みでそろえ、月全体の消化と週バケットの推移を組む。
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
  //? previousYearMonth は addMonthsJst の出力なので常に妥当な形式。空になることはない防御的フォールバック。
  const previousStart = previousDates[0] ?? start;
  const previousEnd = previousDates.at(-1) ?? end;

  //? 対象月+前月を1本のレンジクエリで読む(CVX-10: withIndex のみ、filter なし)。
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

  //? ゴミ箱の記録・日を必ず除く(presetReview / computeMonthBreakdown / weeklyReview と同じ前提)。
  //? 忘れると削除した記録が月次サマリーに残り続けるバグになる。
  const live = liveRows(rows, liveDayDatesFrom(days));
  const currentRows = live.filter((row) => row.dateJst >= start && row.dateJst <= end);
  const previousRows = live.filter(
    (row) => row.dateJst >= previousStart && row.dateJst <= previousEnd,
  );

  const current = aggregateBreakdownRows(currentRows, catalog.itemById, catalog.categoryById);
  const previous = aggregateBreakdownRows(previousRows, catalog.itemById, catalog.categoryById);

  //? 確定記録が1件以上ある暦日数。週次レビューの「実施日」と同じ定義。
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
    //? 月全体(今日を除く)の消化。日付リストの長さを前提にしない汎用関数なのでそのまま再利用する。
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
