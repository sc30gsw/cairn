import * as v from "valibot";
import { DATE_JST_PATTERN } from "~domain/domain";

const YEAR_MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

function isCalendarDate(value: string): boolean {
  if (!DATE_JST_PATTERN.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return day <= daysInMonth;
}

export const DateJstSchema = v.pipe(
  v.string(),
  v.check(isCalendarDate, "日付は YYYY-MM-DD 形式で指定してください"),
);

export const YearMonthSchema = v.pipe(
  v.string(),
  v.regex(YEAR_MONTH_PATTERN, "月は YYYY-MM 形式で指定してください"),
);
