import { sum } from "remeda";
import { daysUntil, type DateJst } from "~domain/jst";
import type { MinutesByDate } from "~domain/minutesByDate";
import { qualifyingDays } from "~domain/qualifyingDays";

import type { WeekBreakdown } from "~/features/history/types/history";

//? 実施日の集計はサーバと同じ純関数を使う(convex/lib が唯一の実装 — CVX-16)。
export { minutesByDateFromRows } from "~domain/minutesByDate";
export type { MinutesByDate } from "~domain/minutesByDate";

export type WeeklyProgressInput = Pick<WeekBreakdown, "weeklyGoal"> & {
  minutesByDate: MinutesByDate;
  todayJst: DateJst;
  weekEndJst: WeekBreakdown["weekEnd"];
};

export type WeeklyProgressResult = {
  daysLeft: number;
  doneDays: number;
  goalDays: number;
  percent: number;
  remainingDays: number;
  todayMinutes: number;
  todayReached: boolean;
  weekMinutes: number;
};

export function minutesByDateFromDays(
  days: readonly (Record<"confirmedMinutes", number> & Record<"dateJst", string>)[],
): MinutesByDate {
  return Object.fromEntries(days.map((day) => [day.dateJst, day.confirmedMinutes]));
}

//* 「週 n 日 × 1日あたり最低 m 分」に対する今週の進み具合。分数の合計は判定に使わない。
export function computeWeeklyProgress(input: WeeklyProgressInput): WeeklyProgressResult {
  const todayMinutes = input.minutesByDate[input.todayJst] ?? 0;
  //? 総分数は判定に使わない補助表示(CONTEXT.md 週間ゴール)
  const weekMinutes = sum(Object.values(input.minutesByDate));
  const daysLeft = Math.max(0, daysUntil(input.todayJst, input.weekEndJst) + 1);
  const goal = input.weeklyGoal;

  if (goal === null) {
    return {
      daysLeft,
      doneDays: 0,
      goalDays: 0,
      percent: 0,
      remainingDays: 0,
      todayMinutes,
      todayReached: false,
      weekMinutes,
    };
  }

  const doneDays = qualifyingDays(input.minutesByDate, goal.dailyFloorMinutes);

  return {
    daysLeft,
    doneDays,
    goalDays: goal.days,
    percent: goal.days <= 0 ? 0 : Math.min(100, Math.round((doneDays / goal.days) * 100)),
    remainingDays: Math.max(0, goal.days - doneDays),
    todayMinutes,
    todayReached: todayMinutes > 0 && todayMinutes >= goal.dailyFloorMinutes,
    weekMinutes,
  };
}
