import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireDateJst, requireWeekStartJst } from "../../lib/dateArgs";
import { aggregateBreakdownRows } from "../../lib/historyBreakdown";
import { addDaysJst, mondayOfWeek } from "../../lib/jst";
import { formatWeeklyShareMarkdown } from "../../lib/share";
import type { WeeklyReviewDto } from "../../lib/validators";
import {
  buildWeeklyDigest,
  buildWeeklyReviewDays,
  elapsedDaysInWeek,
} from "../../lib/weeklyReview";
import { buildConditionByDate, liveDayDatesFrom, liveRows } from "../history/shared";
import { buildTargetProgress } from "../targets/buildTargetProgress";

const WEEK_LENGTH = 7;

//* 週次レビュー1画面ぶん。対象週+前週を1本のレンジ読みでそろえ、消化・ターゲット・共有文まで組む。
export async function weeklyReview(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; weekStartJst: string },
): Promise<WeeklyReviewDto> {
  //? 形が壊れた引数はここで弾く。非月曜は月曜へ正規化する(listWithProgress と同じ規則)。
  const todayJst = requireDateJst(args.todayJst);
  const weekStart = requireWeekStartJst(args.weekStartJst);
  const weekEnd = addDaysJst(weekStart, 6);
  const weekDates = Array.from({ length: WEEK_LENGTH }, (_, offset) =>
    addDaysJst(weekStart, offset),
  );
  const previousWeekStart = addDaysJst(weekStart, -7);
  const previousWeekEnd = addDaysJst(weekStart, -1);
  const isCurrentWeek = weekStart === mondayOfWeek(todayJst);

  //? 対象週+前週の14日を1本のレンジクエリで読む(CVX-10: withIndex のみ、filter なし)。
  //? targets は今週だけ必要なので、過去週では読まない(無駄な購読を増やさない)。
  const [rows, days, catalog, targets] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", previousWeekStart).lte("dateJst", weekEnd),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", previousWeekStart).lte("dateJst", weekEnd),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
    isCurrentWeek
      ? ctx.db
          .query("targets")
          .withIndex("by_owner_and_category", (q) => q.eq("ownerId", ownerId))
          .collect()
      : Promise.resolve([]),
  ]);

  //? ゴミ箱の記録・日を必ず除く(presetReview / listWithProgress / computeWeekPage と同じ前提)。
  //? 忘れると削除した記録が週の実績に残り続けるバグになる。
  const liveDayDates = liveDayDatesFrom(days);
  const live = liveRows(rows, liveDayDates);
  const currentRows = live.filter((row) => row.dateJst >= weekStart && row.dateJst <= weekEnd);
  const previousRows = live.filter(
    (row) => row.dateJst >= previousWeekStart && row.dateJst <= previousWeekEnd,
  );

  const current = aggregateBreakdownRows(currentRows, catalog.itemById, catalog.categoryById);
  const previous = aggregateBreakdownRows(previousRows, catalog.itemById, catalog.categoryById);
  //? 確定記録が1件以上ある暦日数。1パスで日付だけを集める
  const activeDaysOf = (targetRows: readonly (typeof live)[number][]) => {
    const dates = new Set<string>();
    for (const row of targetRows) {
      if (row.status === "確定") {
        dates.add(row.dateJst);
      }
    }
    return dates.size;
  };
  const activeDays = activeDaysOf(currentRows);
  const statusRows = currentRows.map((row) => ({
    dateJst: row.dateJst,
    minutes: row.minutes,
    status: row.status,
  }));

  return {
    activeDays,
    byDay: buildWeeklyReviewDays({
      conditionByDate: buildConditionByDate(days),
      liveDayDates,
      rows: statusRows,
      todayJst,
      weekDates,
    }),
    confirmedMinutes: current.confirmedMinutes,
    digest: buildWeeklyDigest(weekDates, statusRows, todayJst),
    elapsedDays: elapsedDaysInWeek(weekDates, todayJst),
    isCurrentWeek,
    previousActiveDays: activeDaysOf(previousRows),
    previousConfirmedMinutes: previous.confirmedMinutes,
    previousWeekStart,
    shareMarkdown: formatWeeklyShareMarkdown({
      activeDays,
      rows: current.rows,
      volumeMinutes: current.confirmedMinutes,
      weekEnd,
      weekStart,
    }),
    skippedMinutes: current.skippedMinutes,
    //? 今週専用の計器(CONTEXT「週間ターゲット」)。過去週は null にして UI に数値を出させない。
    targets: isCurrentWeek
      ? buildTargetProgress({
          categoryById: catalog.categoryById,
          itemById: catalog.itemById,
          rows: currentRows,
          targets,
        })
      : null,
    weekEnd,
    weekStart,
  };
}
