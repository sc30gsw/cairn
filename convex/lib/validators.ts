import { type Infer, v } from "convex/values";

import { CATEGORIES } from "./categories";
import { CONDITIONS } from "./conditions";
import { GOAL_TYPES, STATUSES, TARGET_METRICS } from "./domain";

const [toeic, listening, reading, conversation, otherCategory] = CATEGORIES;
const [good, ordinary, collapsed] = CONDITIONS;
const [confirmed, pending, skipped] = STATUSES;
const [examType, masteryType] = GOAL_TYPES;
const [minutesMetric, daysMetric, countMetric] = TARGET_METRICS;

export const categoryValidator = v.union(
  v.literal(toeic),
  v.literal(listening),
  v.literal(reading),
  v.literal(conversation),
  v.literal(otherCategory),
);

export const statusValidator = v.union(
  v.literal(confirmed),
  v.literal(pending),
  v.literal(skipped),
);

export type StatusDto = Infer<typeof statusValidator>;
export type RowStatus = StatusDto;

export const presetLineValidator = v.object({
  content: v.string(),
  itemId: v.id("items"),
  minutes: v.number(),
});

export type PresetLine = Infer<typeof presetLineValidator>;

export const presetLineDtoValidator = v.object({
  content: v.string(),
  itemId: v.id("items"),
  itemName: v.string(),
  minutes: v.number(),
});

export type PresetLineDto = Infer<typeof presetLineDtoValidator>;

export const shareRowValidator = v.object({
  category: v.string(),
  categorySortOrder: v.number(),
  content: v.string(),
  itemName: v.string(),
  minutes: v.number(),
  sortOrder: v.number(),
  status: statusValidator,
});

export type ShareRow = Infer<typeof shareRowValidator>;

export const conditionValidator = v.union(
  v.literal(good),
  v.literal(ordinary),
  v.literal(collapsed),
);

export const breakdownRowValidator = v.object({
  category: v.string(),
  itemName: v.string(),
  minutes: v.number(),
  status: statusValidator,
});

export const categoryBreakdownValidator = v.object({
  category: v.string(),
  categorySortOrder: v.number(),
  minutes: v.number(),
});

export const monthDayValidator = v.object({
  dateJst: v.string(),
  isRest: v.boolean(),
  minutes: v.number(),
  movingAverage: v.number(),
});

export const monthEventValidator = v.object({
  category: v.string(),
  dateJst: v.string(),
  minutes: v.number(),
  rowId: v.id("rows"),
  status: statusValidator,
  title: v.string(),
});

export const weekDayBreakdownValidator = v.object({
  confirmedMinutes: v.number(),
  dateJst: v.string(),
  isRest: v.boolean(),
  skippedMinutes: v.number(),
});

export const dayBreakdownValidator = v.object({
  byCategory: v.array(categoryBreakdownValidator),
  confirmedMinutes: v.number(),
  dateJst: v.string(),
  isRest: v.boolean(),
  rows: v.array(breakdownRowValidator),
  skippedMinutes: v.number(),
});

export const weekBreakdownValidator = v.object({
  byCategory: v.array(categoryBreakdownValidator),
  byDay: v.array(weekDayBreakdownValidator),
  confirmedMinutes: v.number(),
  rows: v.array(breakdownRowValidator),
  skippedMinutes: v.number(),
  volumeMinutes: v.number(),
  weekEnd: v.string(),
  weekStart: v.string(),
});

export const monthBreakdownValidator = v.object({
  byCategory: v.array(categoryBreakdownValidator),
  confirmedMinutes: v.number(),
  days: v.array(monthDayValidator),
  events: v.array(monthEventValidator),
  rows: v.array(breakdownRowValidator),
  skippedMinutes: v.number(),
});

export const yearHeatmapValidator = v.object({
  days: v.array(monthDayValidator),
  endDate: v.string(),
  startDate: v.string(),
});

export type BreakdownRow = Infer<typeof breakdownRowValidator>;
export type CategoryBreakdown = Infer<typeof categoryBreakdownValidator>;
export type MonthBreakdownDay = Infer<typeof monthDayValidator>;
export type MonthEventDto = Infer<typeof monthEventValidator>;
export type WeekDayBreakdown = Infer<typeof weekDayBreakdownValidator>;
export type DayBreakdown = Infer<typeof dayBreakdownValidator>;
export type WeekBreakdown = Infer<typeof weekBreakdownValidator>;
export type MonthBreakdown = Infer<typeof monthBreakdownValidator>;
export type YearHeatmapDto = Infer<typeof yearHeatmapValidator>;

export const rowDtoValidator = v.object({
  _id: v.id("rows"),
  category: v.string(),
  categorySortOrder: v.number(),
  content: v.string(),
  itemId: v.id("items"),
  itemName: v.string(),
  minutes: v.number(),
  sortOrder: v.number(),
  status: statusValidator,
});

export const dayDtoValidator = v.object({
  _id: v.id("days"),
  condition: v.union(conditionValidator, v.null()),
  dateJst: v.string(),
  memo: v.union(v.string(), v.null()),
});

export const itemDtoValidator = v.object({
  _id: v.id("items"),
  categoryId: v.id("categories"),
  name: v.string(),
  sortOrder: v.number(),
});

export const categoryDtoValidator = v.object({
  _id: v.id("categories"),
  name: v.string(),
  sortOrder: v.number(),
});

export const presetDtoValidator = v.object({
  _id: v.id("presets"),
  lines: v.array(presetLineDtoValidator),
  name: v.string(),
  weekday: v.number(),
});

export const goalTypeValidator = v.union(v.literal(examType), v.literal(masteryType));

export type GoalTypeDto = Infer<typeof goalTypeValidator>;

//* 目標はタイプごとに入力欄が変わる discriminated union。共有フィールドは content と type だけ。
const examGoalFields = v.object({
  content: v.string(),
  examDate: v.string(),
  maxScore: v.number(),
  minScore: v.number(),
  type: v.literal(examType),
});

//? achievedAt は setAchieved の担当なので、作成・更新の入力には含めない(編集で達成を消さない)。
//? deadline を持つ習得が「チェックポイント」。別タイプではないので枝は増やさない。
const masteryGoalInputFields = v.object({
  content: v.string(),
  criterion: v.string(),
  deadline: v.optional(v.string()),
  type: v.literal(masteryType),
});

const masteryGoalFields = masteryGoalInputFields.extend({ achievedAt: v.optional(v.string()) });

//? 自己判定の較正のために併記する学習量の実績。保存はせず list が毎回導出する。
const masteryProgressFields = {
  activeDays: v.number(),
  confirmedMinutes: v.number(),
};

const goalOwnerField = { ownerId: v.string() };

export const goalDocumentValidator = v.union(
  examGoalFields.extend(goalOwnerField),
  masteryGoalFields.extend(goalOwnerField),
);

const goalIdField = { _id: v.id("goals") };

export const goalDtoValidator = v.union(
  examGoalFields.extend(goalIdField),
  masteryGoalFields.extend({ ...goalIdField, ...masteryProgressFields }),
);

export type GoalDto = Infer<typeof goalDtoValidator>;

export const goalInputValidator = v.union(examGoalFields, masteryGoalInputFields);

export type GoalInput = Infer<typeof goalInputValidator>;

//* 週間ターゲット。常設定義・週次スナップショットなしの「今週専用の計器」。
export const targetMetricValidator = v.union(
  v.literal(minutesMetric),
  v.literal(daysMetric),
  v.literal(countMetric),
);

export type TargetMetricDto = Infer<typeof targetMetricValidator>;

export const targetProgressDtoValidator = v.object({
  _id: v.id("targets"),
  achieved: v.boolean(),
  categoryId: v.id("categories"),
  categoryName: v.string(),
  current: v.number(),
  metric: targetMetricValidator,
  targetValue: v.number(),
});

export type TargetProgressDto = Infer<typeof targetProgressDtoValidator>;

export const obstacleDtoValidator = v.object({
  _id: v.id("obstaclePlans"),
  ifText: v.string(),
  thenText: v.string(),
});

export type ObstacleDto = Infer<typeof obstacleDtoValidator>;

export const trashedDayValidator = v.object({
  _id: v.id("days"),
  dateJst: v.string(),
  deletedAt: v.number(),
});

export type TrashedDay = Infer<typeof trashedDayValidator>;

export const trashedRowValidator = v.object({
  _id: v.id("rows"),
  content: v.string(),
  dateJst: v.string(),
  deletedAt: v.number(),
  itemName: v.string(),
  minutes: v.number(),
  status: statusValidator,
});

export type TrashedRow = Infer<typeof trashedRowValidator>;

export const trashPageValidator = v.object({
  days: v.array(trashedDayValidator),
  rows: v.array(trashedRowValidator),
});

export type TrashPageDto = Infer<typeof trashPageValidator>;

export const presetApplyResultValidator = v.object({
  applied: v.boolean(),
});

export type PresetApplyResult = Infer<typeof presetApplyResultValidator>;

export const dayPageValidator = v.object({
  dateJst: v.string(),
  day: v.union(dayDtoValidator, v.null()),
  isFuture: v.boolean(),
  rows: v.array(rowDtoValidator),
  shareMarkdown: v.string(),
  volumeMinutes: v.number(),
});

export type DayPageDto = Infer<typeof dayPageValidator>;

export const historyWeekValidator = v.object({
  events: v.array(monthEventValidator),
  volumeMinutes: v.number(),
  weekEnd: v.string(),
  weekStart: v.string(),
});

export type HistoryWeekDto = Infer<typeof historyWeekValidator>;

export const historyMonthValidator = v.object({
  days: v.array(monthDayValidator),
});

export type HistoryMonthDto = Infer<typeof historyMonthValidator>;

export type RowDto = Infer<typeof rowDtoValidator>;
export type DayDto = Infer<typeof dayDtoValidator>;
export type ItemDto = Infer<typeof itemDtoValidator>;
export type CategoryDto = Infer<typeof categoryDtoValidator>;
export type PresetDto = Infer<typeof presetDtoValidator>;

export const categoryItemOrderValidator = v.object({
  categoryId: v.id("categories"),
  orderedItemIds: v.array(v.id("items")),
});

export type CategoryItemOrder = Infer<typeof categoryItemOrderValidator>;

export const applyItemOrderArgsValidator = v.object({
  updates: v.array(categoryItemOrderValidator),
});

export type ApplyItemOrderInput = Infer<typeof applyItemOrderArgsValidator>;

export const recentConcreteActionsValidator = v.array(v.string());

export type RecentConcreteActions = Infer<typeof recentConcreteActionsValidator>;
