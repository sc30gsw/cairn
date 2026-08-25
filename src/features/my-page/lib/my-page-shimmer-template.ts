import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import type { ExamGoal } from "~/features/my-page/types/exam-goal";
import type { TodaySummaryTarget } from "~/features/my-page/types/today-summary-target";

//? PeriodSummarySection の digest 型は review 側 components/ の非公開型なので、feature-lib 境界(vite.config.ts)を跨がず
//? review-queries.ts と同じ生成済み api から自前で導出する
type PeriodDigest = FunctionReturnType<
  typeof api.queries.review.weeklyReview.weeklyReview
>["digest"];

//? 「試験目標あり」の分岐(残り日数の大きい数字が出る方)をテンプレートにする。目標未設定の分岐は Text 一行だけで構造差が小さい
export const myPageShimmerExamGoal = {
  _id: "shimmer-exam-goal" as ExamGoal["_id"],
  content: "英検準1級 一次試験",
  createdAt: 0,
  examDate: "2026-09-30",
  maxScore: 100,
  minScore: 0,
  type: "exam",
} as const satisfies ExamGoal;

//? 実データに近い3件(週間ターゲットは通常2〜3件)にしてレイアウトシフトを防ぐ
const SHIMMER_TARGET_CATEGORIES = [
  "TOEIC対策",
  "多聴",
  "英会話",
] as const satisfies readonly TodaySummaryTarget["categoryName"][];

export const myPageShimmerTargets = SHIMMER_TARGET_CATEGORIES.map((categoryName, index) => ({
  _id: `shimmer-target-${categoryName}` as TodaySummaryTarget["_id"],
  achieved: index === 0,
  categoryId: `shimmer-category-${categoryName}` as TodaySummaryTarget["categoryId"],
  categoryName,
  current: 300,
  metric: "minutes",
  targetValue: 300,
})) satisfies TodaySummaryTarget[];

export const myPageShimmerToday = "2026-08-25";

//? 週次・月次サマリーの土台(実施日・学習量・消化率)。数値は今日の状況の実データ感に合わせただけのダミー
export const myPageShimmerActiveDays = 5;
export const myPageShimmerConfirmedMinutes = 620;
export const myPageShimmerPeriodDigest = {
  confirmedCount: 39,
  countedFrom: "2026-08-17",
  countedThrough: "2026-08-22",
  digestRate: 0.78,
  isPartial: false,
  leftoverCount: 6,
  ongoingCount: 2,
  plannedCount: 50,
  skippedCount: 3,
} as const satisfies PeriodDigest;
