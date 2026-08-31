import { GOAL_DATE_MESSAGE } from "./domain";
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
