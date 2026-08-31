import type { Infer } from "convex/values";
import { expect, test } from "vite-plus/test";

import type { BoardScheduleView } from "./boardScheduleRange";
import { BOARD_SCHEDULE_VIEWS } from "./boardScheduleRange";
import type { Weekday } from "./catalog";
import { WEEKDAYS } from "./catalog";
import type { Category } from "./categories";
import { CATEGORIES } from "./categories";
import type { Condition } from "./conditions";
import { CONDITIONS } from "./conditions";
import type { DayViewKind } from "./dayView";
import { DAY_VIEW_KINDS } from "./dayView";
import type { CheckpointBackfillPlan, GoalType, Status, TargetMetric } from "./domain";
import { CHECKPOINT_BACKFILL_PLANS, GOAL_TYPES, STATUSES, TARGET_METRICS } from "./domain";
import type { NotificationKind } from "./notifications";
import { NOTIFICATION_KINDS } from "./notifications";
import type { PresetReviewReason } from "./presetDigest";
import { PRESET_REVIEW_REASONS } from "./presetDigest";
import {
  boardScheduleViewValidator,
  categoryValidator,
  checkpointBackfillPlanValidator,
  conditionValidator,
  dayViewKindValidator,
  goalTypeValidator,
  notificationKindValidator,
  presetReviewReasonValidator,
  statusValidator,
  targetMetricValidator,
  weekdayValidator,
} from "./validators";

function literalValues(members: readonly { value: unknown }[]) {
  return members.map((member) => member.value);
}

test("categoryValidator は CATEGORIES と1対1対応する", () => {
  expect(literalValues(categoryValidator.members)).toEqual([...CATEGORIES]);
});

test("statusValidator は STATUSES と1対1対応する", () => {
  expect(literalValues(statusValidator.members)).toEqual([...STATUSES]);
});

test("weekdayValidator は WEEKDAYS と1対1対応する", () => {
  expect(literalValues(weekdayValidator.members)).toEqual([...WEEKDAYS]);
});

test("conditionValidator は CONDITIONS と1対1対応する", () => {
  expect(literalValues(conditionValidator.members)).toEqual([...CONDITIONS]);
});

test("goalTypeValidator は GOAL_TYPES と1対1対応する", () => {
  expect(literalValues(goalTypeValidator.members)).toEqual([...GOAL_TYPES]);
});

test("checkpointBackfillPlanValidator は CHECKPOINT_BACKFILL_PLANS と1対1対応する", () => {
  expect(literalValues(checkpointBackfillPlanValidator.members)).toEqual([
    ...CHECKPOINT_BACKFILL_PLANS,
  ]);
});

test("targetMetricValidator は TARGET_METRICS と1対1対応する", () => {
  expect(literalValues(targetMetricValidator.members)).toEqual([...TARGET_METRICS]);
});

test("dayViewKindValidator は DAY_VIEW_KINDS と1対1対応する", () => {
  expect(literalValues(dayViewKindValidator.members)).toEqual([...DAY_VIEW_KINDS]);
});

test("presetReviewReasonValidator は PRESET_REVIEW_REASONS と1対1対応する", () => {
  expect(literalValues(presetReviewReasonValidator.members)).toEqual([...PRESET_REVIEW_REASONS]);
});

test("boardScheduleViewValidator は BOARD_SCHEDULE_VIEWS と1対1対応する", () => {
  expect(literalValues(boardScheduleViewValidator.members)).toEqual([...BOARD_SCHEDULE_VIEWS]);
});

test("notificationKindValidator は NOTIFICATION_KINDS と1対1対応する", () => {
  expect(literalValues(notificationKindValidator.members)).toEqual([...NOTIFICATION_KINDS]);
});

type ExhaustiveCheck<Inferred, Domain> = [Inferred] extends [Domain]
  ? [Domain] extends [Inferred]
    ? true
    : never
  : never;

const _category: ExhaustiveCheck<Infer<typeof categoryValidator>, Category> = true;
const _status: ExhaustiveCheck<Infer<typeof statusValidator>, Status> = true;
const _weekday: ExhaustiveCheck<Infer<typeof weekdayValidator>, Weekday> = true;
const _condition: ExhaustiveCheck<Infer<typeof conditionValidator>, Condition> = true;
const _goalType: ExhaustiveCheck<Infer<typeof goalTypeValidator>, GoalType> = true;
const _checkpointBackfillPlan: ExhaustiveCheck<
  Infer<typeof checkpointBackfillPlanValidator>,
  CheckpointBackfillPlan
> = true;
const _targetMetric: ExhaustiveCheck<Infer<typeof targetMetricValidator>, TargetMetric> = true;
const _dayViewKind: ExhaustiveCheck<Infer<typeof dayViewKindValidator>, DayViewKind> = true;
const _presetReviewReason: ExhaustiveCheck<
  Infer<typeof presetReviewReasonValidator>,
  PresetReviewReason
> = true;
const _boardScheduleView: ExhaustiveCheck<
  Infer<typeof boardScheduleViewValidator>,
  BoardScheduleView
> = true;
const _notificationKind: ExhaustiveCheck<
  Infer<typeof notificationKindValidator>,
  NotificationKind
> = true;

test("コンパイル時の網羅性チェックが評価される(上の const 群がビルドを通ること自体が検証)", () => {
  expect([
    _category,
    _status,
    _weekday,
    _condition,
    _goalType,
    _checkpointBackfillPlan,
    _targetMetric,
    _dayViewKind,
    _presetReviewReason,
    _boardScheduleView,
    _notificationKind,
  ]).toEqual(Array<true>(11).fill(true));
});
