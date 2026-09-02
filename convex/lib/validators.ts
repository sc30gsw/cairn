import { type Infer, v } from "convex/values";

import { boardScheduleColorValidator } from "./boardScheduleColors";
import { BOARD_SCHEDULE_VIEWS } from "./boardScheduleRange";
import { WEEKDAYS } from "./catalog";
import { CATEGORIES } from "./categories";
import { CONDITIONS } from "./conditions";
import { DAY_VIEW_KINDS } from "./dayView";
import { CHECKPOINT_BACKFILL_PLANS, GOAL_TYPES, STATUSES, TARGET_METRICS } from "./domain";
import { NOTIFICATION_KINDS, NOTIFICATION_PENDING_SOURCES } from "./notifications";
import { PRESET_REVIEW_REASONS } from "./presetDigest";

const [examType, masteryType] = GOAL_TYPES;

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

export const conditionValidator = v.union(...CONDITIONS.map((condition) => v.literal(condition)));

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

export const rowTimerDtoValidator = v.object({
  accumulatedMs: v.number(),
  autoStoppedAt: v.union(v.number(), v.null()),
  startedAt: v.union(v.number(), v.null()),
});

export type RowTimerDto = Infer<typeof rowTimerDtoValidator>;

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

export const goalTypeValidator = v.union(v.literal(examType), v.literal(masteryType));

export type GoalTypeDto = Infer<typeof goalTypeValidator>;

export const examResultValidator = v.object({
  recordedAt: v.string(),
  score: v.number(),
});

export type ExamResultDto = Infer<typeof examResultValidator>;

const examGoalInputFields = v.object({
  content: v.string(),
  examDate: v.string(),
  maxScore: v.number(),
  minScore: v.number(),
  type: v.literal(examType),
});

//? 結果が入った本番目標は「終了」。進行中 / 終了の判別は result の有無だけ（ADR-0015）
const examGoalFields = examGoalInputFields.extend({
  result: v.optional(examResultValidator),
});

const masteryGoalInputFields = v.object({
  content: v.string(),
  criterion: v.string(),
  deadline: v.optional(v.string()),
  parentGoalId: v.optional(v.id("goals")),
  scopeItemIds: v.optional(v.array(v.id("items"))),
  type: v.literal(masteryType),
});

const masteryGoalFields = masteryGoalInputFields.extend({
  achievedAt: v.optional(v.string()),
  reflection: v.optional(v.string()),
});

const masteryProgressFields = {
  activeDays: v.number(),
  confirmedMinutes: v.number(),
};

const masteryProgressValidator = v.object(masteryProgressFields);

export type MasteryProgress = Infer<typeof masteryProgressValidator>;

const masteryGoalDocumentFields = masteryGoalFields.extend(masteryProgressFields);

const goalOwnerField = { ownerId: v.string() };

export const goalDocumentValidator = v.union(
  examGoalFields.extend(goalOwnerField),
  masteryGoalDocumentFields.extend(goalOwnerField),
);

const goalIdField = { _id: v.id("goals"), createdAt: v.number() };

export const goalDtoValidator = v.union(
  examGoalFields.extend(goalIdField),
  masteryGoalDocumentFields.extend(goalIdField),
);

export type GoalDto = Infer<typeof goalDtoValidator>;

export const goalInputValidator = v.union(examGoalInputFields, masteryGoalInputFields);

export type GoalInput = Infer<typeof goalInputValidator>;

export const checkpointBackfillPlanValidator = v.union(
  ...CHECKPOINT_BACKFILL_PLANS.map((plan) => v.literal(plan)),
);

export const checkpointParentAuditOwnerValidator = v.object({
  examGoalCount: v.number(),
  longTermCount: v.number(),
  orphanCount: v.number(),
  ownerId: v.string(),
  plan: checkpointBackfillPlanValidator,
  promoteLosesDeadline: v.union(v.string(), v.null()),
});

export const checkpointParentAuditValidator = v.object({
  chainedCount: v.number(),
  crossOwnerParentCount: v.number(),
  danglingParentCount: v.number(),
  malformedDeadlineCount: v.number(),
  orphanCount: v.number(),
  owners: v.array(checkpointParentAuditOwnerValidator),
  parentWithoutDeadlineCount: v.number(),
  selfParentCount: v.number(),
  truncated: v.boolean(),
});

export type CheckpointParentAudit = Infer<typeof checkpointParentAuditValidator>;
export type CheckpointParentAuditOwner = Infer<typeof checkpointParentAuditOwnerValidator>;

export const backfillCheckpointParentsResultValidator = v.object({
  assigned: v.number(),
  plan: checkpointBackfillPlanValidator,
  promoted: v.number(),
});

export type BackfillCheckpointParentsResult = Infer<
  typeof backfillCheckpointParentsResultValidator
>;

export const targetMetricValidator = v.union(...TARGET_METRICS.map((metric) => v.literal(metric)));

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

export const methodLaneDtoValidator = v.object({
  _id: v.id("methodLanes"),
  name: v.string(),
  sortOrder: v.number(),
});

export type MethodLaneDto = Infer<typeof methodLaneDtoValidator>;

export const methodDtoValidator = v.object({
  _id: v.id("methods"),
  bodyText: v.string(),
  completionHtml: v.string(),
  laneId: v.id("methodLanes"),
  memoHtml: v.string(),
  name: v.string(),
  nowViewing: v.boolean(),
  sortOrder: v.number(),
});

export type MethodDto = Infer<typeof methodDtoValidator>;

export const methodCatalogValidator = v.object({
  lanes: v.array(methodLaneDtoValidator),
  methods: v.array(methodDtoValidator),
});

export type MethodCatalogDto = Infer<typeof methodCatalogValidator>;

export const laneMethodOrderValidator = v.object({
  laneId: v.id("methodLanes"),
  orderedMethodIds: v.array(v.id("methods")),
});

export type LaneMethodOrder = Infer<typeof laneMethodOrderValidator>;

export const applyMethodOrderArgsValidator = v.object({
  updates: v.array(laneMethodOrderValidator),
});

export type ApplyMethodOrderInput = Infer<typeof applyMethodOrderArgsValidator>;

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

export const boardScheduleEventDtoValidator = v.object({
  _id: v.id("boardScheduleEvents"),
  color: boardScheduleColorValidator,
  endAt: v.string(),
  rowId: v.id("rows"),
  startAt: v.string(),
  title: v.string(),
});

export const boardScheduleViewValidator = v.union(
  ...BOARD_SCHEDULE_VIEWS.map((view) => v.literal(view)),
);

export type BoardScheduleEventDto = Infer<typeof boardScheduleEventDtoValidator>;

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

const [checkpointDeadlineKind, eveningUntouchedKind, weeklyTargetMissKind] = NOTIFICATION_KINDS;

export const notificationKindValidator = v.union(
  v.literal(checkpointDeadlineKind),
  v.literal(eveningUntouchedKind),
  v.literal(weeklyTargetMissKind),
);

export type NotificationKindDto = Infer<typeof notificationKindValidator>;

const checkpointDeadlineItemValidator = v.object({
  content: v.string(),
  daysLeft: v.number(),
  deadline: v.string(),
  goalId: v.id("goals"),
});

const weeklyTargetShortfallValidator = v.object({
  categoryName: v.string(),
  current: v.number(),
  metric: targetMetricValidator,
  targetValue: v.number(),
});

export const notificationPayloadValidator = v.union(
  v.object({
    dateJst: v.string(),
    items: v.array(checkpointDeadlineItemValidator),
    kind: v.literal(checkpointDeadlineKind),
  }),
  v.object({
    dateJst: v.string(),
    kind: v.literal(eveningUntouchedKind),
    pendingCount: v.number(),
    source: v.union(...NOTIFICATION_PENDING_SOURCES.map((source) => v.literal(source))),
  }),
  v.object({
    kind: v.literal(weeklyTargetMissKind),
    shortfalls: v.array(weeklyTargetShortfallValidator),
    weekStartJst: v.string(),
  }),
);

export type NotificationPayload = Infer<typeof notificationPayloadValidator>;

export const notificationTriggerPrefsValidator = v.object({
  checkpointDeadline: v.boolean(),
  eveningUntouched: v.boolean(),
  weeklyTargetMiss: v.boolean(),
});

export type NotificationTriggerPrefs = Infer<typeof notificationTriggerPrefsValidator>;

export const notificationDtoValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("notifications"),
  payload: notificationPayloadValidator,
  read: v.boolean(),
});

export type NotificationDto = Infer<typeof notificationDtoValidator>;

export const notificationPageValidator = v.object({
  items: v.array(notificationDtoValidator),
  unreadCount: v.number(),
});

export type NotificationPageDto = Infer<typeof notificationPageValidator>;

export const notificationSettingsDtoValidator = v.object({
  enabled: v.boolean(),
  eveningHourJst: v.number(),
  quietFromHourJst: v.number(),
  quietToHourJst: v.number(),
  triggers: notificationTriggerPrefsValidator,
});

export type NotificationSettingsDto = Infer<typeof notificationSettingsDtoValidator>;

//? PushSubscription.toJSON() の形をそのまま保存する（endpoint / keys.p256dh / keys.auth / expirationTime）
export const pushSubscriptionKeysValidator = v.object({
  auth: v.string(),
  p256dh: v.string(),
});

export const pushSubscriptionInputValidator = v.object({
  endpoint: v.string(),
  expirationTime: v.optional(v.number()),
  keys: pushSubscriptionKeysValidator,
});

export type PushSubscriptionInput = Infer<typeof pushSubscriptionInputValidator>;

export const pushSubscriptionDtoValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("pushSubscriptions"),
  endpoint: v.string(),
});

export type PushSubscriptionDto = Infer<typeof pushSubscriptionDtoValidator>;

export const webPushMessageValidator = v.object({
  body: v.string(),
  tag: v.string(),
  title: v.string(),
  url: v.string(),
});

export type WebPushMessage = Infer<typeof webPushMessageValidator>;

export const webPushDeliveryValidator = v.union(
  v.object({
    message: webPushMessageValidator,
    subscriptions: v.array(
      v.object({
        _id: v.id("pushSubscriptions"),
        endpoint: v.string(),
        keys: pushSubscriptionKeysValidator,
      }),
    ),
  }),
  v.null(),
);

export type WebPushDelivery = Infer<typeof webPushDeliveryValidator>;

export const webPushConfigValidator = v.object({
  publicKey: v.union(v.string(), v.null()),
});

export type WebPushConfigDto = Infer<typeof webPushConfigValidator>;
