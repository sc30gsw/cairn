import { GOAL_DATE_MESSAGE, YEAR_MONTH_MESSAGE, YEAR_MONTH_PATTERN } from "./domain";
import { ValidationFailedError } from "./errors";
import { isDateJst, mondayOfWeek } from "./jst";
import { throwDomain } from "./ownerFunctions";

//? 日付系引数（日・週・月）の検証規則は1本: 壊れた形式は ValidationFailedError を throw する。
//? 空の DTO で耐えることはしない — 壊れた引数は URL 改変時にしか起きず、画面側に ErrorState がある
//? （docs/specs/monthly-review.md 改訂 2026-09-02、#81）。クライアントは Valibot の validateSearch で先に弾く
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
