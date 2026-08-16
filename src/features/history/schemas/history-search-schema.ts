import * as v from "valibot";

import { AnalysisScopeSchema } from "~/features/history/schemas/analysis-scope-schema";

const HistoryTabSchema = v.picklist(["month", "week", "analysis"]);

const DATE_JST_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
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

const DateJstSchema = v.pipe(
  v.string(),
  v.check(isCalendarDate, "日付は YYYY-MM-DD 形式で指定してください"),
);

const YearMonthSchema = v.pipe(
  v.string(),
  v.regex(YEAR_MONTH_PATTERN, "月は YYYY-MM 形式で指定してください"),
);

export const HistorySearchSchema = v.object({
  date: v.optional(DateJstSchema),
  month: v.optional(YearMonthSchema),
  scope: v.optional(AnalysisScopeSchema),
  tab: v.optional(HistoryTabSchema),
  week: v.optional(DateJstSchema),
});

export type HistorySearch = v.InferOutput<typeof HistorySearchSchema>;
export type HistoryTab = v.InferOutput<typeof HistoryTabSchema>;

export const historySearchDefaults = {
  date: undefined,
  month: undefined,
  scope: "day",
  tab: "month",
  week: undefined,
} as const satisfies HistorySearch;
