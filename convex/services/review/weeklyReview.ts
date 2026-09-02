import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireDateJst, requireWeekStartJst } from "../../lib/dateArgs";
import { aggregateBreakdownRows } from "../../lib/historyBreakdown";
import { addDaysJst, mondayOfWeek } from "../../lib/jst";
import { formatWeeklyShareMarkdown } from "../../lib/share";
import type { WeeklyReviewDto } from "../../lib/validators";
import { buildDigest, buildWeeklyReviewDays, elapsedDaysInRange } from "../../lib/weeklyReview";
import { buildConditionByDate, liveDayDatesFrom, liveRows } from "../history/shared";
import { buildTargetProgress } from "../targets/buildTargetProgress";

const WEEK_LENGTH = 7;

export async function weeklyReview(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; weekStartJst: string },
): Promise<WeeklyReviewDto> {
  const todayJst = requireDateJst(args.todayJst);
  const weekStart = requireWeekStartJst(args.weekStartJst);
  const weekEnd = addDaysJst(weekStart, 6);
  const weekDates = Array.from({ length: WEEK_LENGTH }, (_, offset) =>
    addDaysJst(weekStart, offset),
  );
  const previousWeekStart = addDaysJst(weekStart, -7);
  const previousWeekEnd = addDaysJst(weekStart, -1);
  const isCurrentWeek = weekStart === mondayOfWeek(todayJst);

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

  const liveDayDates = liveDayDatesFrom(days);
  const live = liveRows(rows, liveDayDates);
  const currentRows = live.filter((row) => row.dateJst >= weekStart && row.dateJst <= weekEnd);
  const previousRows = live.filter(
    (row) => row.dateJst >= previousWeekStart && row.dateJst <= previousWeekEnd,
  );

  const current = aggregateBreakdownRows(currentRows, catalog.itemById, catalog.categoryById);
  const previous = aggregateBreakdownRows(previousRows, catalog.itemById, catalog.categoryById);
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
    digest: buildDigest(weekDates, statusRows, todayJst),
    elapsedDays: elapsedDaysInRange(weekDates, todayJst),
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
