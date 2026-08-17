import type { WeeklyTrendWeek, WeeklyTrendWeeks } from "~/features/goals/types/goal";

//? "2026-08-04" → "8/4" 。週ラベルは月/日で十分読める
export function shortDateLabel(dateJst: string) {
  const [, month, day] = dateJst.split("-");
  return `${Number(month)}/${Number(day)}`;
}

//? 記録もゴールもない週は表示しない(未記録の休養週で一覧を埋めない)
export function recordedWeeks(weeks: WeeklyTrendWeeks) {
  return weeks.filter((week) => week.goalDays !== null || week.volumeMinutes > 0);
}

//? 判定の単位は実施日。分数は補助表示にとどめる(CONTEXT.md 週間ゴール)
export function qualifyingDaysLabel(week: WeeklyTrendWeek) {
  return week.goalDays === null
    ? `実施日 ${week.qualifyingDays}日`
    : `実施日 ${week.qualifyingDays}/${week.goalDays}日`;
}
