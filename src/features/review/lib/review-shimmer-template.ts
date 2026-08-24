import type { MonthlyReview } from "~/features/review/types/monthly-review";
import type { WeeklyReview, WeeklyReviewTarget } from "~/features/review/types/weekly-review";

//? 実データと同じ配列長(7日 / ターゲット3件)にしてレイアウトシフトを防ぐ
const SHIMMER_WEEK_DATES = [
  "2026-08-17",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
  "2026-08-22",
  "2026-08-23",
] as const;

const SHIMMER_TARGET_CATEGORIES = ["TOEIC対策", "多聴", "英会話"] as const;

export const reviewShimmerWeekly = {
  activeDays: 5,
  byDay: SHIMMER_WEEK_DATES.map((dateJst, index) => ({
    condition: "普通" as const,
    confirmedCount: 4,
    confirmedMinutes: 60 + index * 10,
    dateJst,
    digestRate: 0.8,
    kind: "live" as const,
    plannedCount: 5,
    skippedCount: 1,
  })),
  confirmedMinutes: 620,
  digest: {
    confirmedCount: 39,
    countedFrom: "2026-08-17",
    countedThrough: "2026-08-22",
    digestRate: 0.78,
    isPartial: false,
    leftoverCount: 6,
    ongoingCount: 2,
    plannedCount: 50,
    skippedCount: 3,
  },
  elapsedDays: 7,
  isCurrentWeek: true,
  previousActiveDays: 4,
  previousConfirmedMinutes: 540,
  previousWeekStart: "2026-08-10",
  shareMarkdown: "週次まとめ 2026-08-17〜2026-08-23（学習量 620分 / 実施 5日）",
  skippedMinutes: 30,
  targets: SHIMMER_TARGET_CATEGORIES.map((categoryName, index) => ({
    _id: `shimmer-target-${categoryName}` as WeeklyReviewTarget["_id"],
    achieved: index === 0,
    categoryId: `shimmer-category-${categoryName}` as WeeklyReviewTarget["categoryId"],
    categoryName,
    current: 300,
    metric: "minutes" as const,
    targetValue: 300,
  })),
  weekEnd: "2026-08-23",
  weekStart: "2026-08-17",
} satisfies WeeklyReview;

//? 週バケット5件・カテゴリ3件と、実データに近い配列長にしてレイアウトシフトを防ぐ
const SHIMMER_MONTH_BUCKETS = [
  { bucketEnd: "2026-08-02", bucketStart: "2026-08-01", isPartial: true },
  { bucketEnd: "2026-08-09", bucketStart: "2026-08-03", isPartial: false },
  { bucketEnd: "2026-08-16", bucketStart: "2026-08-10", isPartial: false },
  { bucketEnd: "2026-08-23", bucketStart: "2026-08-17", isPartial: false },
  { bucketEnd: "2026-08-30", bucketStart: "2026-08-24", isPartial: false },
] as const;

const SHIMMER_MONTH_CATEGORIES = ["TOEIC対策", "多聴", "英会話"] as const;

export const reviewShimmerMonthly = {
  activeDays: 18,
  byCategory: SHIMMER_MONTH_CATEGORIES.map((category, index) => ({
    category,
    categorySortOrder: index,
    minutes: 620 - index * 200,
  })),
  confirmedMinutes: 1240,
  digest: {
    confirmedCount: 41,
    countedFrom: "2026-08-01",
    countedThrough: "2026-08-30",
    digestRate: 0.82,
    isPartial: true,
    leftoverCount: 5,
    ongoingCount: 2,
    plannedCount: 50,
    skippedCount: 2,
  },
  digestTrend: SHIMMER_MONTH_BUCKETS.map((bucket, index) => ({
    ...bucket,
    confirmedCount: 8,
    digestRate: 0.8 - index * 0.05,
    plannedCount: 10,
  })),
  elapsedDays: 30,
  isCurrentMonth: true,
  monthEnd: "2026-08-31",
  monthStart: "2026-08-01",
  previousActiveDays: 15,
  previousByCategory: SHIMMER_MONTH_CATEGORIES.map((category, index) => ({
    category,
    categorySortOrder: index,
    minutes: 540 - index * 180,
  })),
  previousConfirmedMinutes: 1080,
  previousYearMonth: "2026-07",
  skippedMinutes: 30,
  yearMonth: "2026-08",
} satisfies MonthlyReview;
