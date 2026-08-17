import { GOAL_DATE_MESSAGE } from "./domain";
import { ValidationFailedError } from "./errors";
import { isDateJst, mondayOfWeek, todayJst } from "./jst";
import { throwDomain } from "./ownerFunctions";

export const WEEK_NOT_CURRENT_MESSAGE = "変更できるのは今週だけです";

//* Convex validator は v.string() までしか縛れないので、日付の形は境界で弾く。
//? 素通しすると jst ヘルパー内の Intl が RangeError を投げ、ドメインエラーにならない。
export function requireDateJst(dateJst: string): string {
  if (!isDateJst(dateJst)) {
    throwDomain(new ValidationFailedError({ message: GOAL_DATE_MESSAGE }));
  }
  return dateJst;
}

//* 週キーは必ず月曜へ正規化する。非月曜を素通しすると 7日窓が2週にまたがり、
//? weeklyGoals には同じ実週に対して月曜キーと非月曜キーの2行が並びうる。
export function requireWeekStartJst(weekStartJst: string): string {
  return mondayOfWeek(requireDateJst(weekStartJst));
}

//* mutation 専用。週間ゴールの書き込みは「今週」に閉じる(schema weeklyGoals「その週だけ上書きできる」)。
//? クライアントの週指定をそのまま信じると、過去週のスナップショットを後から書き換えられる。
//? 現在時刻はサーバが決める。query から呼んではいけない(CVX-14 は query 限定の制約)。
export function requireCurrentWeekStartJst(weekStartJst: string): string {
  const weekStart = requireWeekStartJst(weekStartJst);
  if (weekStart !== mondayOfWeek(todayJst())) {
    throwDomain(new ValidationFailedError({ message: WEEK_NOT_CURRENT_MESSAGE }));
  }
  return weekStart;
}
