import { type Infer, v } from "convex/values";

import { WEEKDAYS } from "../catalog";
import { CATEGORIES } from "../categories";
import { CONDITIONS } from "../conditions";
import { DAY_VIEW_KINDS } from "../dayView";
import { STATUSES } from "../domain";
import {
  calendarFeedEventValidator,
  calendarFeedStatusValidator,
  calendarFeedValidator,
} from "./calendarFeed";
import {
  notificationDtoValidator,
  notificationKindValidator,
  notificationPageValidator,
  notificationPayloadValidator,
  notificationSettingsDtoValidator,
  notificationTriggerPrefsValidator,
  pushSubscriptionDtoValidator,
  pushSubscriptionInputValidator,
  webPushConfigValidator,
  webPushDeliveryValidator,
  webPushMessageValidator,
} from "./notifications";

export const categoryValidator = v.union(...CATEGORIES.map((category) => v.literal(category)));

export const statusValidator = v.union(...STATUSES.map((status) => v.literal(status)));

export const weekdayValidator = v.union(...WEEKDAYS.map((weekday) => v.literal(weekday)));

export type StatusDto = Infer<typeof statusValidator>;

export type RowStatus = StatusDto;

export type WeekdayDto = Infer<typeof weekdayValidator>;

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

export const presetSettingsDtoValidator = v.object({ holidayAsSunday: v.boolean() });

export type PresetSettingsDto = Infer<typeof presetSettingsDtoValidator>;

export const conditionValidator = v.union(...CONDITIONS.map((condition) => v.literal(condition)));

export const rowTimerDtoValidator = v.object({
  accumulatedMs: v.number(),
  autoStoppedAt: v.union(v.number(), v.null()),
  startedAt: v.union(v.number(), v.null()),
});

export type RowTimerDto = Infer<typeof rowTimerDtoValidator>;

//? 復習の印。source = 復習に回した元の記録（次の期日と段階）、review = 期日が来て並んだ復習の記録
export const rowReviewDtoValidator = v.union(
  v.object({ dueJst: v.string(), kind: v.literal("source"), stage: v.number() }),
  v.object({ kind: v.literal("review"), stage: v.number() }),
  v.null(),
);

export type RowReviewDto = Infer<typeof rowReviewDtoValidator>;

export const rowDtoValidator = v.object({
  _id: v.id("rows"),
  category: v.string(),
  categorySortOrder: v.number(),
  content: v.string(),
  itemId: v.id("items"),
  itemName: v.string(),
  minutes: v.number(),
  review: rowReviewDtoValidator,
  sortOrder: v.number(),
  status: statusValidator,
  timer: v.union(rowTimerDtoValidator, v.null()),
});

export const runningTimerDtoValidator = v.object({
  _id: v.id("rows"),
  dateJst: v.string(),
  itemName: v.string(),
  timer: rowTimerDtoValidator,
});

export type RunningTimerDto = Infer<typeof runningTimerDtoValidator>;

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

export const presetApplyResultValidator = v.object({
  applied: v.boolean(),
});

export type PresetApplyResult = Infer<typeof presetApplyResultValidator>;

export const dayViewKindValidator = v.union(...DAY_VIEW_KINDS.map((kind) => v.literal(kind)));

export const dayPageValidator = v.object({
  canCopyYesterday: v.boolean(),
  dateJst: v.string(),
  day: v.union(dayDtoValidator, v.null()),
  kind: dayViewKindValidator,
  rows: v.array(rowDtoValidator),
  shareMarkdown: v.string(),
  volumeMinutes: v.number(),
});

export type DayPageDto = Infer<typeof dayPageValidator>;

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

export type NotificationKindDto = Infer<typeof notificationKindValidator>;

export type NotificationPayload = Infer<typeof notificationPayloadValidator>;

export type NotificationTriggerPrefs = Infer<typeof notificationTriggerPrefsValidator>;

export type NotificationDto = Infer<typeof notificationDtoValidator>;

export type NotificationPageDto = Infer<typeof notificationPageValidator>;

export type NotificationSettingsDto = Infer<typeof notificationSettingsDtoValidator>;

export type PushSubscriptionInput = Infer<typeof pushSubscriptionInputValidator>;

export type PushSubscriptionDto = Infer<typeof pushSubscriptionDtoValidator>;

export type WebPushMessage = Infer<typeof webPushMessageValidator>;

export type WebPushDelivery = Infer<typeof webPushDeliveryValidator>;

export type WebPushConfigDto = Infer<typeof webPushConfigValidator>;

export type CalendarFeedStatusDto = Infer<typeof calendarFeedStatusValidator>;

export type CalendarFeedEventDto = Infer<typeof calendarFeedEventValidator>;

export type CalendarFeedDto = Infer<typeof calendarFeedValidator>;
