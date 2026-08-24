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
