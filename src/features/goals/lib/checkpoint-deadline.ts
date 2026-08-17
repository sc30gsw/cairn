import { addDaysJst, weekdayFromDateJst, type DateJst } from "~domain/jst";

const DAYS_IN_WEEK = 7;
const SUNDAY = 0;

//* チェックポイントの期限の既定値。週の切れ目に置くナッジで、あとから自由に変えられる。
//? 今日が日曜なら「今日」ではなく翌週の日曜。常に1〜7日先を返す(CONTEXT.md「習得」)。
export function nextSundayJst(todayJst: DateJst): DateJst {
  const weekday = weekdayFromDateJst(todayJst);
  const daysAhead = weekday === SUNDAY ? DAYS_IN_WEEK : DAYS_IN_WEEK - weekday;

  return addDaysJst(todayJst, daysAhead);
}
