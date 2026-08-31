import { addDaysJst, weekdayFromDateJst, type DateJst } from "~domain/jst";

const DAYS_IN_WEEK = 7;
const SUNDAY = 0;

export function nextSundayJst(todayJst: DateJst): DateJst {
  const weekday = weekdayFromDateJst(todayJst);
  const daysAhead = weekday === SUNDAY ? DAYS_IN_WEEK : DAYS_IN_WEEK - weekday;

  return addDaysJst(todayJst, daysAhead);
}
