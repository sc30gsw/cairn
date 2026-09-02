import { type Infer, v } from "convex/values";

import { conditionValidator, dayViewKindValidator } from "./core";
import { targetProgressDtoValidator } from "./goals";
import { categoryBreakdownValidator } from "./history";

export const weeklyDigestValidator = v.object({
  confirmedCount: v.number(),
  countedFrom: v.string(),
  countedThrough: v.union(v.string(), v.null()),
  digestRate: v.number(),
  isPartial: v.boolean(),
  leftoverCount: v.number(),
  ongoingCount: v.number(),
  plannedCount: v.number(),
  skippedCount: v.number(),
});

export type WeeklyDigest = Infer<typeof weeklyDigestValidator>;

export const weeklyReviewDayValidator = v.object({
  condition: v.union(conditionValidator, v.null()),
  confirmedCount: v.number(),
  confirmedMinutes: v.number(),
  dateJst: v.string(),
  digestRate: v.union(v.number(), v.null()),
  kind: dayViewKindValidator,
  plannedCount: v.number(),
  skippedCount: v.number(),
});

export type WeeklyReviewDay = Infer<typeof weeklyReviewDayValidator>;

export const weeklyReviewValidator = v.object({
  activeDays: v.number(),
  byDay: v.array(weeklyReviewDayValidator),
  confirmedMinutes: v.number(),
  digest: weeklyDigestValidator,
  elapsedDays: v.number(),
  isCurrentWeek: v.boolean(),
  previousActiveDays: v.number(),
  previousConfirmedMinutes: v.number(),
  previousWeekStart: v.string(),
  shareMarkdown: v.string(),
  skippedMinutes: v.number(),
  targets: v.union(v.array(targetProgressDtoValidator), v.null()),
  weekEnd: v.string(),
  weekStart: v.string(),
});

export type WeeklyReviewDto = Infer<typeof weeklyReviewValidator>;

export const monthlyDigestBucketValidator = v.object({
  bucketEnd: v.string(),
  bucketStart: v.string(),
  confirmedCount: v.number(),
  digestRate: v.number(),
  isPartial: v.boolean(),
  plannedCount: v.number(),
});

export type MonthlyDigestBucket = Infer<typeof monthlyDigestBucketValidator>;

export const monthlyReviewValidator = v.object({
  activeDays: v.number(),
  byCategory: v.array(categoryBreakdownValidator),
  confirmedMinutes: v.number(),
  digest: weeklyDigestValidator,
  digestTrend: v.array(monthlyDigestBucketValidator),
  elapsedDays: v.number(),
  isCurrentMonth: v.boolean(),
  monthEnd: v.string(),
  monthStart: v.string(),
  previousActiveDays: v.number(),
  previousByCategory: v.array(categoryBreakdownValidator),
  previousConfirmedMinutes: v.number(),
  previousYearMonth: v.string(),
  skippedMinutes: v.number(),
  yearMonth: v.string(),
});

export type MonthlyReviewDto = Infer<typeof monthlyReviewValidator>;
