import type { DateJst } from "~domain/jst";

import type { Goal, Obstacle, WeeklyTrendWeeks } from "~/features/goals/types/goal";
import type { TargetProgress } from "~/features/goals/types/target";
import type { WeekPage } from "~/features/history/types/history";
import type { MinutesByDate } from "~/lib/weekly-progress";
import type { CategoryDto } from "~/types/category";

export const goalsShimmerGoals = [
  {
    _id: "shimmer-goal-exam" as Goal["_id"],
    content: "金のフレーズを1 Unit 音読する",
    examDate: "2026-09-27",
    maxScore: 850,
    minScore: 730,
    type: "exam",
  },
  {
    _id: "shimmer-goal-pace" as Goal["_id"],
    content: "帰宅後に Distinction を1セット解く",
    dailyFloorMinutes: 20,
    daysPerWeek: 3,
    type: "pace",
  },
  {
    _id: "shimmer-goal-volume" as Goal["_id"],
    content: "公式問題集を1回分ずつ解く",
    currentAmount: 3,
    deadline: "2026-09-20",
    startAmount: 0,
    targetAmount: 10,
    type: "volume",
    unit: "回",
  },
] satisfies Goal[];

export const goalsShimmerObstacles = [
  {
    _id: "shimmer-obstacle" as Obstacle["_id"],
    ifText: "眠い",
    thenText: "Unit 3 の例文を声に出して5文読む",
  },
] satisfies Obstacle[];

export const goalsShimmerTrendWeeks = [
  {
    achieved: true,
    dailyFloorMinutes: 20,
    goalDays: 3,
    qualifyingDays: 4,
    volumeMinutes: 320,
    weekEnd: "2026-08-16",
    weekStart: "2026-08-10",
  },
  {
    achieved: false,
    dailyFloorMinutes: 20,
    goalDays: 3,
    qualifyingDays: 1,
    volumeMinutes: 180,
    weekEnd: "2026-08-09",
    weekStart: "2026-08-03",
  },
] satisfies WeeklyTrendWeeks;

export const goalsShimmerCategories = [
  { _id: "shimmer-category-input" as CategoryDto["_id"], name: "インプット", sortOrder: 0 },
  { _id: "shimmer-category-output" as CategoryDto["_id"], name: "アウトプット", sortOrder: 1 },
] satisfies CategoryDto[];

//? 実データと同じ件数・同じ形にして、読み込み後のガタつきをなくす
export const goalsShimmerTargets = [
  {
    _id: "shimmer-target-input" as TargetProgress["_id"],
    achieved: true,
    categoryId: "shimmer-category-input" as CategoryDto["_id"],
    categoryName: "インプット",
    current: 180,
    metric: "minutes",
    targetValue: 120,
  },
  {
    _id: "shimmer-target-output" as TargetProgress["_id"],
    achieved: false,
    categoryId: "shimmer-category-output" as CategoryDto["_id"],
    categoryName: "アウトプット",
    current: 2,
    metric: "days",
    targetValue: 3,
  },
] satisfies TargetProgress[];

export const goalsShimmerTodayJst = "2026-08-17" satisfies DateJst;
export const goalsShimmerWeekEndJst = "2026-08-23" satisfies WeekPage["weekEnd"];
export const goalsShimmerWeeklyGoal = {
  dailyFloorMinutes: 20,
  days: 3,
} satisfies WeekPage["weeklyGoal"];
export const goalsShimmerMinutesByDate = { "2026-08-17": 30 } satisfies MinutesByDate;
