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

//? 内容と基準は3つのフォームで共通。区分ごとに期限・親の必須度だけが違う
const MasteryCoreEntries = {
  content: ConcreteActionSchema,
  criterion: v.pipe(v.string(), v.trim(), v.minLength(1, MASTERY_CRITERION_MESSAGE)),
};

//* 新規長期目標。期限欄は出さないので schema にも無い(トップ層は期限も親も持たない)。
export const LongTermGoalFieldsSchema = v.object(MasteryCoreEntries);

//* 新規チェックポイント。期限は必須。親は導線から確定するが、値としても検証する。
export const CheckpointGoalFieldsSchema = v.object({
  ...MasteryCoreEntries,
  deadline: DateJstSchema,
  parentGoalId: v.pipe(v.string(), v.nonEmpty(CHECKPOINT_PARENT_REQUIRED_MESSAGE)),
});

//* 編集(習得)。期限は外せる。期限と親は同時に存在する(INV-1 をフォーム側でも守る)。
export const MasteryEditFieldsSchema = v.pipe(
  v.object({
    ...MasteryCoreEntries,
    deadline: OptionalDateJstSchema,
    //? "" は Select 未選択
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

//? 親 id は一覧から引き当てて Id のブランドを取り戻す(as を書かない)。ここは受け皿の型だけ
const ParentGoalIdSchema = v.custom<GoalId>(
  (value) => typeof value === "string" && value.length > 0,
  CHECKPOINT_PARENT_REQUIRED_MESSAGE,
);

//? 対象項目はフォームストアの外(useState)にあるので、フィールドスキーマではなく
//? 送信ペイロードのスキーマにだけ現れる。空配列は undefined に畳む(サーバの正規化と同じ規則)。
const ScopeItemIdsSchema = v.optional(
  v.pipe(
    v.array(v.string()),
    v.transform((values) => (values.length === 0 ? undefined : values)),
  ),
);

//* 送信ペイロードの形の確認用スキーマ。convex の goalInputValidator と同じ形になる(CVX-16)。
//? type は v.variant の判別子なので mastery の枝は1本のまま(区分では枝を割らない)。
//? 実際に onSubmit / mutation が使う型は GoalInputPayload(Convex 由来。ブランド付き Id を持つ)。
export const GoalSchema = v.variant("type", [
  v.object({ ...ExamGoalFieldsSchema.entries, type: v.literal(examType) }),
  v.object({
    ...MasteryEditFieldsSchema.entries,
    parentGoalId: v.optional(ParentGoalIdSchema),
    scopeItemIds: ScopeItemIdsSchema,
    type: v.literal(masteryType),
  }),
]);
