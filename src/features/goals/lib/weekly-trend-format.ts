import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

//? "2026-08-04" → "8/4" 。週ラベルは月/日で十分読める
export function shortDateLabel(dateJst: string) {
  const [, month, day] = dateJst.split("-");
  return `${Number(month)}/${Number(day)}`;
}

//? 記録もゴールもない週は表示しない(未記録の休養週で一覧を埋めない)
export function recordedWeeks(weeks: WeeklyTrendWeeks) {
  return weeks.filter((week) => week.goalMinutes !== null || week.volumeMinutes > 0);
}
