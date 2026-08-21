import { STATUSES } from "~domain/domain";
import { WEEKDAY_DISPLAY_ORDER } from "~domain/presetDigest";

import type {
  DayBreakdown,
  HeatmapDay,
  MonthBreakdown,
  MonthEvent,
  PresetReview,
  WeekBreakdown,
  WeekPage,
} from "~/features/history/types/history";

const confirmed = STATUSES[0];

export const historyShimmerMonthEvents = [
  {
    category: "多聴",
    dateJst: "2026-08-17",
    minutes: 30,
    rowId: "shimmer-row-1" as MonthEvent["rowId"],
    status: confirmed,
    title: "Distinction 2000",
  },
  {
    category: "多聴",
    dateJst: "2026-08-18",
    minutes: 20,
    rowId: "shimmer-row-2" as MonthEvent["rowId"],
    status: confirmed,
    title: "Distinction 2000",
  },
] satisfies MonthEvent[];

export const historyShimmerWeek = {
  events: [
    {
      category: "多聴",
      dateJst: "2026-08-17",
      minutes: 30,
      rowId: "shimmer-row-1" as WeekPage["events"][number]["rowId"],
      status: confirmed,
      title: "Distinction 2000",
    },
  ],
  volumeMinutes: 30,
  weekEnd: "2026-08-23",
  weekStart: "2026-08-17",
} satisfies WeekPage;

export const historyShimmerHeatmapDays = [
  { dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 },
] satisfies HeatmapDay[];

export const historyShimmerMonthBreakdown = {
  byCategory: [],
  confirmedMinutes: 30,
  days: [{ dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 }],
  events: [],
  rows: [],
  skippedMinutes: 0,
} satisfies MonthBreakdown;

export const historyShimmerDayBreakdown = {
  byCategory: [],
  confirmedMinutes: 0,
  dateJst: "2026-08-17",
  isRest: false,
  rows: [],
  skippedMinutes: 0,
} satisfies DayBreakdown;

export const historyShimmerWeekBreakdown = {
  byCategory: [],
  byDay: [],
  confirmedMinutes: 0,
  rows: [],
  skippedMinutes: 0,
  volumeMinutes: 0,
  weekEnd: "2026-08-23",
  weekStart: "2026-08-17",
} satisfies WeekBreakdown;

export const historyShimmerYearMonth = "2026-08";
export const historyShimmerTodayJst = "2026-08-17";
export const historyShimmerSelectedDateJst = "2026-08-17";

export const historyShimmerPresetReview = {
  suggestions: [],
  weekdays: WEEKDAY_DISPLAY_ORDER.map((weekday) => ({
    confirmed: 0,
    leftover: 0,
    planned: 0,
    skipped: 0,
    weekday,
  })),
  windowEnd: "2026-08-16",
  windowStart: "2026-07-20",
} satisfies PresetReview;
