import { type Infer, v } from "convex/values";

import { CATEGORIES } from "./categories";
import { CONDITIONS } from "./conditions";

const [toeic, listening, reading, conversation, other] = CATEGORIES;
const [good, ordinary, collapsed] = CONDITIONS;

export const categoryValidator = v.union(
  v.literal(toeic),
  v.literal(listening),
  v.literal(reading),
  v.literal(conversation),
  v.literal(other),
);

export const statusValidator = v.union(
  v.literal("確定"),
  v.literal("未着手"),
  v.literal("スキップ"),
);

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

export type BreakdownRow = Infer<typeof breakdownRowValidator>;
export type CategoryBreakdown = Infer<typeof categoryBreakdownValidator>;
export type MonthBreakdownDay = Infer<typeof monthDayValidator>;
export type MonthEventDto = Infer<typeof monthEventValidator>;
export type WeekDayBreakdown = Infer<typeof weekDayBreakdownValidator>;

export type DayBreakdown = {
  byCategory: CategoryBreakdown[];
  confirmedMinutes: number;
  dateJst: string;
  isRest: boolean;
  rows: BreakdownRow[];
  skippedMinutes: number;
};

export type WeekBreakdown = {
  byCategory: CategoryBreakdown[];
  byDay: WeekDayBreakdown[];
  confirmedMinutes: number;
  rows: BreakdownRow[];
  skippedMinutes: number;
  volumeMinutes: number;
  weekEnd: string;
  weekStart: string;
  weeklyGoalMinutes: null | number;
};

export type MonthBreakdown = {
  byCategory: CategoryBreakdown[];
  confirmedMinutes: number;
  days: MonthBreakdownDay[];
  rows: BreakdownRow[];
  skippedMinutes: number;
};

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
  lines: v.array(
    v.object({
      content: v.string(),
      itemId: v.id("items"),
      itemName: v.string(),
      minutes: v.number(),
    }),
  ),
  name: v.string(),
  weekday: v.number(),
});
