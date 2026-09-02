import { type Infer, v } from "convex/values";

import { CHECKPOINT_BACKFILL_PLANS, GOAL_TYPES, TARGET_METRICS } from "../domain";

const [examType, masteryType] = GOAL_TYPES;

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

export const obstacleDtoValidator = v.object({
  _id: v.id("obstaclePlans"),
  ifText: v.string(),
  thenText: v.string(),
});

export type ObstacleDto = Infer<typeof obstacleDtoValidator>;
