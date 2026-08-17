import * as v from "valibot";
import {
  DATE_JST_PATTERN,
  GOAL_DATE_MESSAGE,
  GOAL_TYPES,
  MASTERY_CRITERION_MESSAGE,
  TOEIC_SCORE,
  TOEIC_SCORE_ORDER_MESSAGE,
  TOEIC_SCORE_RANGE_MESSAGE,
  TOEIC_SCORE_STEP_MESSAGE,
} from "~domain/domain";

import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

const [examType, masteryType] = GOAL_TYPES;

//? 検証メッセージはサーバと共有のドメイン定数を使う。文言も数値もここで手書きしない(CVX-16)。
const DateJstSchema = v.pipe(
  v.string(GOAL_DATE_MESSAGE),
  v.regex(DATE_JST_PATTERN, GOAL_DATE_MESSAGE),
);

//? DatePickerInput は未選択を "" で返す。空欄は「期限なし」として undefined に畳む
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

//* タイプごとの入力欄。フォームは1タイプ1ストアなので、`type` は送信時に付ける。
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

//? 期限を持つ習得が「チェックポイント」。別タイプではないので枝は増やさない(docs/adr/0006)。
//? 達成日は setAchieved の担当なので、この入力には含めない(編集で達成を消さない)。
export const MasteryGoalFieldsSchema = v.object({
  content: ConcreteActionSchema,
  criterion: v.pipe(v.string(), v.trim(), v.minLength(1, MASTERY_CRITERION_MESSAGE)),
  deadline: OptionalDateJstSchema,
});

//* 送信ペイロードの単一の真実。convex の goalInputValidator と同じ形になる(CVX-16)。
export const GoalSchema = v.variant("type", [
  v.object({ ...ExamGoalFieldsSchema.entries, type: v.literal(examType) }),
  v.object({ ...MasteryGoalFieldsSchema.entries, type: v.literal(masteryType) }),
]);

export type GoalFormOutput = v.InferOutput<typeof GoalSchema>;
