import * as v from "valibot";
import {
  DATE_JST_PATTERN,
  GOAL_TYPES,
  PACE_LIMITS,
  TOEIC_SCORE,
  VOLUME_UNITS,
} from "~domain/domain";

import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

const [examType, paceType, volumeType, masteryType, otherType] = GOAL_TYPES;

//? メッセージはドメイン定数から組み立てる。数値そのものを文言に手書きしない(CVX-16)。
const GOAL_DATE_MESSAGE = "日付は YYYY-MM-DD で入力してください";
export const TOEIC_SCORE_RANGE_MESSAGE = `スコアは${TOEIC_SCORE.min}〜${TOEIC_SCORE.max}で入力してください`;
export const TOEIC_SCORE_STEP_MESSAGE = `スコアは${TOEIC_SCORE.step}点刻みで入力してください`;
export const TOEIC_SCORE_ORDER_MESSAGE = "目標点の下限が上限を超えています";
const PACE_DAYS_MESSAGE = `週の実施日数は${PACE_LIMITS.minDays}〜${PACE_LIMITS.maxDays}日で入力してください`;
const PACE_FLOOR_MESSAGE = `1日あたりの最低分数は${PACE_LIMITS.minFloorMinutes}分以上です`;
const VOLUME_TARGET_MESSAGE = "目標量は1以上で入力してください";
const VOLUME_AMOUNT_MESSAGE = "現在量は0以上です";
const VOLUME_UNIT_MESSAGE = "単位を選んでください";
const MASTERY_CRITERION_MESSAGE = "達成の基準を入力してください";

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

const OptionalTextSchema = v.pipe(
  v.string(),
  v.trim(),
  v.transform((value) => (value === "" ? undefined : value)),
);

const ToeicScoreSchema = v.pipe(
  v.number(TOEIC_SCORE_RANGE_MESSAGE),
  v.integer(TOEIC_SCORE_RANGE_MESSAGE),
  v.minValue(TOEIC_SCORE.min, TOEIC_SCORE_RANGE_MESSAGE),
  v.maxValue(TOEIC_SCORE.max, TOEIC_SCORE_RANGE_MESSAGE),
  v.multipleOf(TOEIC_SCORE.step, TOEIC_SCORE_STEP_MESSAGE),
);

export const PaceDaysSchema = v.pipe(
  v.number(PACE_DAYS_MESSAGE),
  v.integer(PACE_DAYS_MESSAGE),
  v.minValue(PACE_LIMITS.minDays, PACE_DAYS_MESSAGE),
  v.maxValue(PACE_LIMITS.maxDays, PACE_DAYS_MESSAGE),
);

export const PaceFloorMinutesSchema = v.pipe(
  v.number(PACE_FLOOR_MESSAGE),
  v.integer(PACE_FLOOR_MESSAGE),
  v.minValue(PACE_LIMITS.minFloorMinutes, PACE_FLOOR_MESSAGE),
);

export const VolumeAmountSchema = v.pipe(
  v.number(VOLUME_AMOUNT_MESSAGE),
  v.minValue(0, VOLUME_AMOUNT_MESSAGE),
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

export const PaceGoalFieldsSchema = v.object({
  content: ConcreteActionSchema,
  dailyFloorMinutes: PaceFloorMinutesSchema,
  daysPerWeek: PaceDaysSchema,
});

export const VolumeGoalFieldsSchema = v.object({
  content: ConcreteActionSchema,
  deadline: DateJstSchema,
  startAmount: VolumeAmountSchema,
  targetAmount: v.pipe(v.number(VOLUME_TARGET_MESSAGE), v.minValue(1, VOLUME_TARGET_MESSAGE)),
  unit: v.picklist(VOLUME_UNITS, VOLUME_UNIT_MESSAGE),
});

export const MasteryGoalFieldsSchema = v.object({
  content: ConcreteActionSchema,
  criterion: v.pipe(v.string(), v.trim(), v.minLength(1, MASTERY_CRITERION_MESSAGE)),
  deadline: OptionalDateJstSchema,
});

export const OtherGoalFieldsSchema = v.object({
  content: ConcreteActionSchema,
  deadline: OptionalDateJstSchema,
  memo: OptionalTextSchema,
});

//* 送信ペイロードの単一の真実。convex の goalInputValidator と同じ形になる(CVX-16)。
export const GoalSchema = v.variant("type", [
  v.object({ ...ExamGoalFieldsSchema.entries, type: v.literal(examType) }),
  v.object({ ...PaceGoalFieldsSchema.entries, type: v.literal(paceType) }),
  v.object({ ...VolumeGoalFieldsSchema.entries, type: v.literal(volumeType) }),
  v.object({ ...MasteryGoalFieldsSchema.entries, type: v.literal(masteryType) }),
  v.object({ ...OtherGoalFieldsSchema.entries, type: v.literal(otherType) }),
]);

export type GoalFormOutput = v.InferOutput<typeof GoalSchema>;
