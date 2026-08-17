import type { DateJst } from "~domain/jst";

import type { Goal, Obstacle } from "~/features/goals/types/goal";
import type { TargetProgress } from "~/features/goals/types/target";
import type { CategoryDto } from "~/types/category";

export const goalsShimmerTodayJst = "2026-08-17" satisfies DateJst;

//? 実データと同じ件数・同じ形にして、読み込み後のガタつきをなくす
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
    _id: "shimmer-goal-checkpoint" as Goal["_id"],
    achievedAt: undefined,
    activeDays: 4,
    confirmedMinutes: 180,
    content: "Unit 1-10 を音読する",
    criterion: "Unit 1-10 を止まらずに音読できる",
    deadline: "2026-08-23",
    type: "mastery",
  },
  {
    _id: "shimmer-goal-mastery" as Goal["_id"],
    achievedAt: undefined,
    activeDays: 2,
    confirmedMinutes: 90,
    content: "Distinction の例文を口頭で言い切る",
    criterion: "3秒以内に例文を口に出せる",
    deadline: undefined,
    type: "mastery",
  },
] satisfies Goal[];

export const goalsShimmerObstacles = [
  {
    _id: "shimmer-obstacle" as Obstacle["_id"],
    ifText: "眠い",
    thenText: "Unit 3 の例文を声に出して5文読む",
  },
] satisfies Obstacle[];

export const goalsShimmerCategories = [
  { _id: "shimmer-category-input" as CategoryDto["_id"], name: "インプット", sortOrder: 0 },
  { _id: "shimmer-category-output" as CategoryDto["_id"], name: "アウトプット", sortOrder: 1 },
] satisfies CategoryDto[];

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
