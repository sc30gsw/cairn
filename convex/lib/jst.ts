//* 日は JST の暦日。クエリ内では Date.now() を呼ばず、呼び出し側が dateJst を渡す。

import { DATE_JST_PATTERN } from "./domain";

const JST_CALENDAR_DATE = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Tokyo",
  year: "numeric",
});

export function todayJst(now = new Date()): string {
  return JST_CALENDAR_DATE.format(now);
}

/** JST 暦日 `YYYY-MM-DD`。`todayJst()` の戻り値から派生する。 */
export type DateJst = ReturnType<typeof todayJst>;

//* 形式(YYYY-MM-DD)と実在する暦日の両方を満たすか。
//? 素通しすると "2026-02-31" が 3/3 に転がり、パースできない文字列は Intl が RangeError を投げる。
export function isDateJst(value: string): boolean {
  if (!DATE_JST_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T12:00:00+09:00`);
  return !Number.isNaN(parsed.getTime()) && todayJst(parsed) === value;
}

export function weekdayFromDateJst(dateJst: string): number {
  return new Date(`${dateJst}T12:00:00+09:00`).getUTCDay();
}

export function addDaysJst(dateJst: string, days: number): string {
  const date = new Date(`${dateJst}T12:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return todayJst(date);
}

export function compareDateJst(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function isFutureDateJst(dateJst: string, today: string): boolean {
  return compareDateJst(dateJst, today) > 0;
}

export function mondayOfWeek(dateJst: string): string {
  const weekday = weekdayFromDateJst(dateJst);
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addDaysJst(dateJst, -daysFromMonday);
}

export function calendarDatesInMonth(yearMonth: string): string[] {
  const [yearText, monthText] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const dates: string[] = [];
  for (let day = 1; day <= 31; day += 1) {
    const dateJst = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const probe = new Date(`${dateJst}T12:00:00+09:00`);
    if (probe.getUTCMonth() + 1 !== month) {
      break;
    }
    dates.push(dateJst);
  }
  return dates;
}

export function daysUntil(fromDateJst: string, toDateJst: string): number {
  const from = new Date(`${fromDateJst}T12:00:00+09:00`).getTime();
  const to = new Date(`${toDateJst}T12:00:00+09:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}
