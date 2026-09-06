import { GOAL_DATE_MESSAGE, YEAR_MONTH_MESSAGE, YEAR_MONTH_PATTERN } from "./domain";
import { ValidationFailedError } from "./errors";
import { isDateJst, mondayOfWeek } from "./jst";
import { throwDomain } from "./ownerFunctions";

export function requireDateJst(dateJst: string): string {
  if (!isDateJst(dateJst)) {
    throwDomain(new ValidationFailedError({ message: GOAL_DATE_MESSAGE }));
  }
  return dateJst;
}

export function requireWeekStartJst(weekStartJst: string): string {
  return mondayOfWeek(requireDateJst(weekStartJst));
}

export function requireYearMonth(yearMonth: string): string {
  if (!YEAR_MONTH_PATTERN.test(yearMonth)) {
    throwDomain(new ValidationFailedError({ message: YEAR_MONTH_MESSAGE }));
  }
  return yearMonth;
}
