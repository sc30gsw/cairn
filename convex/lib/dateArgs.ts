import { ValidationFailedError } from "./errors";
import { isDateJst, mondayOfWeek } from "./jst";
import { throwDomain } from "./ownerFunctions";

export const DATE_JST_MESSAGE = "日付は YYYY-MM-DD で入力してください";

//* Convex validator は v.string() までしか縛れないので、日付の形は境界で弾く。
//? 素通しすると jst ヘルパー内の Intl が RangeError を投げ、ドメインエラーにならない。
export function requireDateJst(dateJst: string): string {
  if (!isDateJst(dateJst)) {
    throwDomain(new ValidationFailedError({ message: DATE_JST_MESSAGE }));
  }
  return dateJst;
}

//* 週キーは必ず月曜へ正規化する。非月曜を素通しすると 7日窓が2週にまたがり、
//? weeklyGoals には同じ実週に対して月曜キーと非月曜キーの2行が並びうる。
export function requireWeekStartJst(weekStartJst: string): string {
  return mondayOfWeek(requireDateJst(weekStartJst));
}
