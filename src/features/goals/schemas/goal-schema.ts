import * as v from "valibot";
import {
  CHECKPOINT_PARENT_REQUIRED_MESSAGE,
  DATE_JST_PATTERN,
  GOAL_DATE_MESSAGE,
  GOAL_TYPES,
  MASTERY_CRITERION_MESSAGE,
  TOEIC_SCORE,
  TOEIC_SCORE_ORDER_MESSAGE,
  TOEIC_SCORE_RANGE_MESSAGE,
  TOEIC_SCORE_STEP_MESSAGE,
} from "~domain/domain";

import type { GoalId } from "~/features/goals/types/goal";
import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

const [examType, masteryType] = GOAL_TYPES;

const DateJstSchema = v.pipe(
  v.string(GOAL_DATE_MESSAGE),
  v.regex(DATE_JST_PATTERN, GOAL_DATE_MESSAGE),
);

const OptionalDateJstSchema = v.pipe(
  v.string(GOAL_DATE_MESSAGE),
  v.check((value) => value === "" || DATE_JST_PATTERN.test(value), GOAL_DATE_MESSAGE),
  v.transform((value) => (value === "" ? undefined : value)),
);

const ToeicScoreSchema = v.pipe(
  v.number(TOEIC_SCORE_RANGE_MESSAGE),
  v.integer(TOEIC_SCORE_RANGE_MESSAGE),
  v.minValue(TOEIC_SCORE.min, TOEIC_SCORE_RANGE_MESSAGE),
  v.maxValue(TOEIC_SCORE.max, TOEIC_SCORE_RANGE_MESSAGE),
  v.multipleOf(TOEIC_SCORE.step, TOEIC_SCORE_STEP_MESSAGE),
);

export const ExamGoalFieldsSchema = v.pipe(
  v.object({
    content: ConcreteActionSchema,
    examDate: DateJstSchema,
    maxScore: ToeicScoreSchema,
    minScore: ToeicScoreSchema,
  }),
  v.forward(
    v.partialCheck(
      [["maxScore"], ["minScore"]],
      (input) => input.minScore <= input.maxScore,
      TOEIC_SCORE_ORDER_MESSAGE,
    ),
    ["maxScore"],
  ),
);

const MasteryCoreEntries = {
  content: ConcreteActionSchema,
  criterion: v.pipe(v.string(), v.trim(), v.minLength(1, MASTERY_CRITERION_MESSAGE)),
};

export const LongTermGoalFieldsSchema = v.object(MasteryCoreEntries);

export const CheckpointGoalFieldsSchema = v.object({
  ...MasteryCoreEntries,
  deadline: DateJstSchema,
  parentGoalId: v.pipe(v.string(), v.nonEmpty(CHECKPOINT_PARENT_REQUIRED_MESSAGE)),
});

export const MasteryEditFieldsSchema = v.pipe(
  v.object({
    ...MasteryCoreEntries,
    deadline: OptionalDateJstSchema,
    parentGoalId: v.optional(v.string()),
  }),
  v.forward(
    v.partialCheck(
      [["deadline"], ["parentGoalId"]],
      (input) =>
        (input.deadline === undefined) ===
        (input.parentGoalId === undefined || input.parentGoalId === ""),
      CHECKPOINT_PARENT_REQUIRED_MESSAGE,
    ),
    ["parentGoalId"],
  ),
);

const ParentGoalIdSchema = v.custom<GoalId>(
  (value) => typeof value === "string" && value.length > 0,
  CHECKPOINT_PARENT_REQUIRED_MESSAGE,
);

const ScopeItemIdsSchema = v.optional(
  v.pipe(
    v.array(v.string()),
    v.transform((values) => (values.length === 0 ? undefined : values)),
  ),
);

export const GoalSchema = v.variant("type", [
  v.object({ ...ExamGoalFieldsSchema.entries, type: v.literal(examType) }),
  v.object({
    ...MasteryEditFieldsSchema.entries,
    parentGoalId: v.optional(ParentGoalIdSchema),
    scopeItemIds: ScopeItemIdsSchema,
    type: v.literal(masteryType),
  }),
]);
