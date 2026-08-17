import { GOAL_DATE_MESSAGE } from "./domain";
import { ValidationFailedError } from "./errors";
import { isDateJst, mondayOfWeek } from "./jst";
import { throwDomain } from "./ownerFunctions";

//* Convex validator は v.string() までしか縛れないので、日付の形は境界で弾く。
//? 素通しすると jst ヘルパー内の Intl が RangeError を投げ、ドメインエラーにならない。
export function requireDateJst(dateJst: string): string {
  if (!isDateJst(dateJst)) {
    throwDomain(new ValidationFailedError({ message: GOAL_DATE_MESSAGE }));
  }
  return dateJst;
}

//* 週キーは必ず月曜へ正規化する。非月曜を素通しすると 7日窓が2週にまたがり、
//? 週間ターゲットの集計窓が実週とずれる。
export function requireWeekStartJst(weekStartJst: string): string {
  return mondayOfWeek(requireDateJst(weekStartJst));
}
