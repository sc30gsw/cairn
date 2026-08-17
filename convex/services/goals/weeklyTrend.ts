import type { QueryCtx } from "../../_generated/server";
import { requireWeekStartJst } from "../../lib/dateArgs";
import { WEEKLY_TREND_WEEKS } from "../../lib/domain";
import { addDaysJst } from "../../lib/jst";
import { minutesByDateFromRows } from "../../lib/minutesByDate";
import { qualifyingDays } from "../../lib/qualifyingDays";
import type { WeeklyTrendWeek } from "../../lib/validators";
import { confirmedVolumeMinutes } from "../../lib/volume";
import { liveDayDatesFrom, liveRows } from "../history/shared";

//* 週間ゴールの達成履歴。今日を含む週の直前から過去 N 週分を新しい順で返す。
//? 判定は「実施日の数 >= 目標日数」。総分数は表示専用で判定に使わない。

type WeekGoalParams = Pick<WeeklyTrendWeek, "dailyFloorMinutes" | "goalDays">;

export async function weeklyTrend(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string },
): Promise<WeeklyTrendWeek[]> {
  const currentWeekStart = requireWeekStartJst(args.todayJst);
  const rangeStart = addDaysJst(currentWeekStart, -7 * WEEKLY_TREND_WEEKS);
  //? 進行中の今週は WeeklyProgressCard が担うので、直前の日曜までで区切る
  const rangeEnd = addDaysJst(currentWeekStart, -1);
  const [rows, days, goals, pace] = await Promise.all([
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
    ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "pace"))
      .first(),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const weekRows = liveRows(rows, liveDayDates);
  const snapshotByWeekStart = new Map(goals.map((goal) => [goal.weekStartJst, goal]));
  //? アプリを開かなかった週にはスナップショットが無い。そこで判定を打ち切ると、ただの未訪問が
  //? ストリークをゼロにしてしまう(ADR-0003 の「1週の未達で連続をゼロにしない」に反する)。
  //? 保存済みスナップショットが最優先で、無い週だけ現在のペース目標から遅延導出する(読み取りのみ)。
  const fallback: WeekGoalParams =
    pace === null || pace.type !== "pace"
      ? { dailyFloorMinutes: null, goalDays: null }
      : { dailyFloorMinutes: pace.dailyFloorMinutes, goalDays: pace.daysPerWeek };
  return Array.from({ length: WEEKLY_TREND_WEEKS }, (_, index) => {
    const weekStart = addDaysJst(currentWeekStart, -7 * (index + 1));
    const weekEnd = addDaysJst(weekStart, 6);
    const rowsInWeek = weekRows.filter((row) => row.dateJst >= weekStart && row.dateJst <= weekEnd);
    const volumeMinutes = confirmedVolumeMinutes(rowsInWeek);
    const snapshot = snapshotByWeekStart.get(weekStart);
    const params: WeekGoalParams =
      snapshot === undefined
        ? fallback
        : { dailyFloorMinutes: snapshot.dailyFloorMinutes, goalDays: snapshot.days };
    if (params.goalDays === null || params.dailyFloorMinutes === null) {
      //? ペース目標そのものが無いなら判定基準が存在しない。判定対象外として返す。
      return {
        achieved: false,
        dailyFloorMinutes: null,
        goalDays: null,
        qualifyingDays: 0,
        volumeMinutes,
        weekEnd,
        weekStart,
      };
    }
    const doneDays = qualifyingDays(minutesByDateFromRows(rowsInWeek), params.dailyFloorMinutes);
    return {
      achieved: doneDays >= params.goalDays,
      dailyFloorMinutes: params.dailyFloorMinutes,
      goalDays: params.goalDays,
      qualifyingDays: doneDays,
      volumeMinutes,
      weekEnd,
      weekStart,
    };
  });
}
