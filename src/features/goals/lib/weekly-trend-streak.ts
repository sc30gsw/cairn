import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

//* 週間ゴールの連続達成数。weeks は新しい順(先頭 = 直近の完了週)を前提とする。
//? ゴール未設定週は「達成した週」とは言えないため、ストリークはそこで途切れる
export function currentStreak(weeks: WeeklyTrendWeeks) {
  let streak = 0;
  for (const week of weeks) {
    if (week.goalMinutes === null || !week.achieved) {
      break;
    }
    streak += 1;
  }
  return streak;
}
