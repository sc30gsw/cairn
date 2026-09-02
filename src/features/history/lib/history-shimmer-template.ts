import { STATUSES } from "~domain/domain";
import { WEEKDAY_DISPLAY_ORDER } from "~domain/presetDigest";

import type {
  DayBreakdown,
  HeatmapDay,
  HistorySearchHit,
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
  days: [
    {
      condition: null,
      dateJst: "2026-08-17",
      isRest: false,
      memo: null,
      minutes: 30,
      movingAverage: 10,
    },
  ],
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
  {
    condition: null,
    dateJst: "2026-08-17",
    isRest: false,
    memo: null,
    minutes: 30,
    movingAverage: 10,
  },
] satisfies HeatmapDay[];

export const historyShimmerMonthBreakdown = {
  byCategory: [],
  byCondition: [],
  confirmedMinutes: 30,
  days: [
    {
      condition: null,
      dateJst: "2026-08-17",
      isRest: false,
      memo: null,
      minutes: 30,
      movingAverage: 10,
    },
  ],
  events: [],
  rows: [],
  skippedMinutes: 0,
} satisfies MonthBreakdown;

export const historyShimmerDayBreakdown = {
  byCategory: [],
  byCondition: [],
  confirmedMinutes: 0,
  dateJst: "2026-08-17",
  isRest: false,
  rows: [],
  skippedMinutes: 0,
} satisfies DayBreakdown;

export const historyShimmerWeekBreakdown = {
  byCategory: [],
  byCondition: [],
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
    ongoing: 0,
    planned: 0,
    skipped: 0,
    weekday,
  })),
  windowEnd: "2026-08-16",
  windowStart: "2026-07-20",
} satisfies PresetReview;

export const historyShimmerSearchHits = [
  {
    category: "インプット",
    dateJst: "2026-08-16",
    kind: "hitokoto",
    minutes: 30,
    rowId: "shimmer-search-row-1" as NonNullable<HistorySearchHit["rowId"]>,
    text: "金フレの音読を30分。Unit 5 まで",
    title: "金のフレーズ",
  },
  {
    dateJst: "2026-08-15",
    kind: "memo",
    text: "朝の音読が続いている。夜は眠くて集中が切れる",
    title: "メモ",
  },
  {
    category: "アウトプット",
    dateJst: "2026-08-14",
    kind: "hitokoto",
    minutes: 20,
    rowId: "shimmer-search-row-2" as NonNullable<HistorySearchHit["rowId"]>,
    text: "音読パッケージ Chapter 2",
    title: "音読パッケージ",
  },
] satisfies HistorySearchHit[];
