import { addDaysJst, compareDateJst } from "~domain/jst";

import type { WeekBreakdown } from "~/features/history/types/history";

export type WeeklyProgressInput = Pick<WeekBreakdown, "volumeMinutes" | "weeklyGoalMinutes"> & {
  todayJst: string;
  weekEndJst: WeekBreakdown["weekEnd"];
};

export type WeeklyProgressResult = {
  dailyNeeded: number;
  daysLeft: number;
  percent: number;
  remaining: number;
};

export function computeWeeklyProgress(input: WeeklyProgressInput): WeeklyProgressResult {
  const goal = input.weeklyGoalMinutes;
  if (goal === null || goal <= 0) {
    return { dailyNeeded: 0, daysLeft: 1, percent: 0, remaining: 0 };
  }

  const remaining = Math.max(0, goal - input.volumeMinutes);
  const percent = Math.min(100, Math.round((input.volumeMinutes / goal) * 100));
  let daysLeft = 1;
  let cursor = input.todayJst;
  while (compareDateJst(cursor, input.weekEndJst) <= 0) {
    daysLeft += 1;
    cursor = addDaysJst(cursor, 1);
  }
  daysLeft = Math.max(1, daysLeft - 1);
  const dailyNeeded = remaining > 0 ? Math.ceil(remaining / daysLeft) : 0;

  return { dailyNeeded, daysLeft, percent, remaining };
}
