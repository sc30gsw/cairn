import type { DateJst } from "~domain/jst";

import type { Goal, Obstacle } from "~/features/goals/types/goal";
import type { TargetProgress } from "~/features/goals/types/target";
import type { CategoryDto } from "~/types/category";
import type { ItemDto } from "~/types/item";

export const goalsShimmerTodayJst = "2026-08-17" satisfies DateJst;

const EXAM_GOAL_ID = "shimmer-goal-exam" as Goal["_id"];
const LONG_TERM_GOAL_ID = "shimmer-goal-long-term" as Goal["_id"];

const INPUT_CATEGORY_ID = "shimmer-category-input" as CategoryDto["_id"];
const OUTPUT_CATEGORY_ID = "shimmer-category-output" as CategoryDto["_id"];
const KINFURE_ITEM_ID = "shimmer-item-kinfure" as ItemDto["_id"];

export const goalsShimmerItems = [
  {
    _id: KINFURE_ITEM_ID,
    categoryId: INPUT_CATEGORY_ID,
    name: "金のフレーズ",
    sortOrder: 0,
  },
  {
    _id: "shimmer-item-shadowing" as ItemDto["_id"],
    categoryId: OUTPUT_CATEGORY_ID,
    name: "音読パッケージ",
    sortOrder: 1,
  },
] satisfies ItemDto[];

export const goalsShimmerGoals = [
  {
    _id: EXAM_GOAL_ID,
    content: "金のフレーズを1 Unit 音読する",
    createdAt: 1_755_000_000_000,
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
    createdAt: 1_755_000_100_000,
    criterion: "Unit 1-10 を止まらずに音読できる",
    deadline: "2026-08-23",
    parentGoalId: EXAM_GOAL_ID,
    scopeItemIds: [KINFURE_ITEM_ID],
    type: "mastery",
  },
  {
    _id: LONG_TERM_GOAL_ID,
    achievedAt: undefined,
    activeDays: 2,
    confirmedMinutes: 90,
    content: "Distinction の例文を口頭で言い切る",
    createdAt: 1_755_000_200_000,
    criterion: "3秒以内に例文を口に出せる",
    deadline: undefined,
    parentGoalId: undefined,
    type: "mastery",
  },
  {
    _id: "shimmer-goal-long-term-checkpoint" as Goal["_id"],
    achievedAt: undefined,
    activeDays: 2,
    confirmedMinutes: 40,
    content: "Chapter 1-3 を暗唱する",
    createdAt: 1_755_000_300_000,
    criterion: "例文を見ずに言える",
    deadline: "2026-09-06",
    parentGoalId: LONG_TERM_GOAL_ID,
    type: "mastery",
  },
  {
    _id: "shimmer-goal-achieved" as Goal["_id"],
    achievedAt: "2026-08-09",
    activeDays: 6,
    confirmedMinutes: 300,
    content: "金のフレーズ Unit 1 を暗唱する",
    createdAt: 1_755_000_400_000,
    criterion: "見ずに Unit 1 を言える",
    deadline: "2026-08-09",
    parentGoalId: EXAM_GOAL_ID,
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
  { _id: INPUT_CATEGORY_ID, name: "インプット", sortOrder: 0 },
  { _id: OUTPUT_CATEGORY_ID, name: "アウトプット", sortOrder: 1 },
] satisfies CategoryDto[];

export const goalsShimmerTargets = [
  {
    _id: "shimmer-target-input" as TargetProgress["_id"],
    achieved: true,
    categoryId: INPUT_CATEGORY_ID,
    categoryName: "インプット",
    current: 180,
    metric: "minutes",
    targetValue: 120,
  },
  {
    _id: "shimmer-target-output" as TargetProgress["_id"],
    achieved: false,
    categoryId: OUTPUT_CATEGORY_ID,
    categoryName: "アウトプット",
    current: 2,
    metric: "days",
    targetValue: 3,
  },
] satisfies TargetProgress[];
