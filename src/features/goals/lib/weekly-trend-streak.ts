import { STREAK_RESERVE_WEEKS } from "~domain/domain";

import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

export type StreakResult = {
  length: number;
  reserveUsed: boolean;
};

//* 週間ゴールの連続達成数。weeks は新しい順(先頭 = 直近の完了週)を前提とする。
//? 1週の未達は「予備」で吸収し、STREAK_RESERVE_WEEKS を超える連続未達で切る。
//? ゴール未設定週は判定対象外なので、そこで打ち切る。
export function currentStreak(weeks: WeeklyTrendWeeks): StreakResult {
  let length = 0;
  let consecutiveMisses = 0;
  let reserveUsed = false;

  for (const week of weeks) {
    if (week.goalDays === null) {
      break;
    }
    if (week.achieved) {
      length += 1;
      consecutiveMisses = 0;
      continue;
    }
    consecutiveMisses += 1;
    if (consecutiveMisses > STREAK_RESERVE_WEEKS) {
      break;
    }
    reserveUsed = true;
  }

  //? 連続が0なら予備で守られたものが無い。直近が未達なだけの状態を「予備を使った」と言わない。
  return { length, reserveUsed: length > 0 && reserveUsed };
}
