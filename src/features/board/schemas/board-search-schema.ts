import * as v from "valibot";
import { BOARD_SCHEDULE_VIEWS } from "~domain/boardScheduleRange";
import { DATE_JST_PATTERN } from "~domain/domain";

const BoardTabSchema = v.picklist(["kanban", "schedule"]);
const BoardScheduleViewSchema = v.picklist(BOARD_SCHEDULE_VIEWS);

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

export const BoardSearchSchema = v.object({
  date: v.optional(DateJstSchema),
  month: v.optional(YearMonthSchema),
  tab: v.optional(BoardTabSchema),
  view: v.optional(BoardScheduleViewSchema),
  week: v.optional(DateJstSchema),
});

export type BoardSearch = v.InferOutput<typeof BoardSearchSchema>;
export type BoardTab = v.InferOutput<typeof BoardTabSchema>;
export type BoardScheduleView = v.InferOutput<typeof BoardScheduleViewSchema>;

export const boardSearchDefaults = {
  date: undefined,
  month: undefined,
  tab: "kanban",
  view: undefined,
  week: undefined,
} as const satisfies BoardSearch;
