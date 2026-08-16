import type { QueryCtx } from "../../_generated/server";
import { addDaysJst, mondayOfWeek } from "../../lib/jst";
import type { WeeklyTrendWeek } from "../../lib/validators";
import { confirmedVolumeMinutes } from "../../lib/volume";
import { liveDayDatesFrom, liveRows } from "../history/shared";

//* 週間ゴールの達成履歴。今日を含む週の直前から過去 N 週分を新しい順で返す。
export const WEEKLY_TREND_WEEKS = 12;

export async function weeklyTrend(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string },
): Promise<WeeklyTrendWeek[]> {
  const currentWeekStart = mondayOfWeek(args.todayJst);
  const rangeStart = addDaysJst(currentWeekStart, -7 * WEEKLY_TREND_WEEKS);
  //? 進行中の今週は WeeklyProgressCard が担うので、直前の日曜までで区切る
  const rangeEnd = addDaysJst(currentWeekStart, -1);
  const [rows, days, goals] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", rangeStart).lte("dateJst", rangeEnd),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", rangeStart).lte("dateJst", rangeEnd),
      )
      .collect(),
    ctx.db
      .query("weeklyGoals")
      .withIndex("by_owner_and_week", (q) =>
        q.eq("ownerId", ownerId).gte("weekStartJst", rangeStart).lte("weekStartJst", rangeEnd),
      )
      .collect(),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const weekRows = liveRows(rows, liveDayDates);
  const goalByWeekStart = new Map(goals.map((goal) => [goal.weekStartJst, goal.minutes]));
  return Array.from({ length: WEEKLY_TREND_WEEKS }, (_, index) => {
    const weekStart = addDaysJst(currentWeekStart, -7 * (index + 1));
    const weekEnd = addDaysJst(weekStart, 6);
    const volumeMinutes = confirmedVolumeMinutes(
      weekRows.filter((row) => row.dateJst >= weekStart && row.dateJst <= weekEnd),
    );
    const goalMinutes = goalByWeekStart.get(weekStart) ?? null;
    return {
      achieved: goalMinutes !== null && volumeMinutes >= goalMinutes,
      goalMinutes,
      volumeMinutes,
      weekEnd,
      weekStart,
    };
  });
}
