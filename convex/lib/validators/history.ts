import { type Infer, v } from "convex/values";

import { PRESET_REVIEW_REASONS } from "../presetDigest";
import { conditionValidator, statusValidator, weekdayValidator } from "./core";

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
  condition: v.union(conditionValidator, v.null()),
  dateJst: v.string(),
  isRest: v.boolean(),
  memo: v.union(v.string(), v.null()),
  minutes: v.number(),
  movingAverage: v.number(),
});

export const conditionVolumeKeyValidator = v.union(conditionValidator, v.literal("未設定"));

export const conditionVolumeValidator = v.object({
  condition: conditionVolumeKeyValidator,
  minutes: v.number(),
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
  byCondition: v.array(conditionVolumeValidator),
  confirmedMinutes: v.number(),
  dateJst: v.string(),
  isRest: v.boolean(),
  rows: v.array(breakdownRowValidator),
  skippedMinutes: v.number(),
});

export const weekBreakdownValidator = v.object({
  byCategory: v.array(categoryBreakdownValidator),
  byCondition: v.array(conditionVolumeValidator),
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
  byCondition: v.array(conditionVolumeValidator),
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

export type ConditionVolume = Infer<typeof conditionVolumeValidator>;

export type ConditionVolumeKey = Infer<typeof conditionVolumeKeyValidator>;

export type MonthBreakdownDay = Infer<typeof monthDayValidator>;

export type MonthEventDto = Infer<typeof monthEventValidator>;

export type WeekDayBreakdown = Infer<typeof weekDayBreakdownValidator>;

export type DayBreakdown = Infer<typeof dayBreakdownValidator>;

export type WeekBreakdown = Infer<typeof weekBreakdownValidator>;

export type MonthBreakdown = Infer<typeof monthBreakdownValidator>;

export type YearHeatmapDto = Infer<typeof yearHeatmapValidator>;

export const historyWeekValidator = v.object({
  days: v.array(monthDayValidator),
  events: v.array(monthEventValidator),
  volumeMinutes: v.number(),
  weekEnd: v.string(),
  weekStart: v.string(),
});

export type HistoryWeekDto = Infer<typeof historyWeekValidator>;

export const historySearchKindValidator = v.union(v.literal("hitokoto"), v.literal("memo"));

export type HistorySearchKind = Infer<typeof historySearchKindValidator>;

export const historySearchHitValidator = v.object({
  category: v.optional(v.string()),
  dateJst: v.string(),
  kind: historySearchKindValidator,
  minutes: v.optional(v.number()),
  rowId: v.optional(v.id("rows")),
  text: v.string(),
  title: v.string(),
});

export type HistorySearchHitDto = Infer<typeof historySearchHitValidator>;

export const historySearchValidator = v.object({
  hits: v.array(historySearchHitValidator),
  truncated: v.boolean(),
});

export type HistorySearchDto = Infer<typeof historySearchValidator>;

export const historyMonthValidator = v.object({
  days: v.array(monthDayValidator),
});

export type HistoryMonthDto = Infer<typeof historyMonthValidator>;

export const presetReviewReasonValidator = v.union(
  ...PRESET_REVIEW_REASONS.map((reason) => v.literal(reason)),
);

export const presetReviewWeekdayValidator = v.object({
  confirmed: v.number(),
  leftover: v.number(),
  ongoing: v.number(),
  planned: v.number(),
  skipped: v.number(),
  weekday: weekdayValidator,
});

export const presetReviewSuggestionValidator = v.object({
  reason: presetReviewReasonValidator,
  weekday: weekdayValidator,
});

export const presetReviewValidator = v.object({
  suggestions: v.array(presetReviewSuggestionValidator),
  weekdays: v.array(presetReviewWeekdayValidator),
  windowEnd: v.string(),
  windowStart: v.string(),
});

export type PresetReviewDto = Infer<typeof presetReviewValidator>;

export type PresetReviewWeekdayDto = Infer<typeof presetReviewWeekdayValidator>;

export type PresetReviewSuggestionDto = Infer<typeof presetReviewSuggestionValidator>;
