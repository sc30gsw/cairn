import * as v from "valibot";
import { expect, test } from "vite-plus/test";
import {
  CHECKPOINT_PARENT_REQUIRED_MESSAGE,
  MASTERY_CRITERION_MESSAGE,
  TOEIC_SCORE_ORDER_MESSAGE,
  TOEIC_SCORE_RANGE_MESSAGE,
  TOEIC_SCORE_STEP_MESSAGE,
} from "~domain/domain";

import {
  CheckpointGoalFieldsSchema,
  ExamGoalFieldsSchema,
  GoalSchema,
  LongTermGoalFieldsSchema,
  MasteryEditFieldsSchema,
} from "~/features/goals/schemas/goal-schema";

function firstIssue(result: v.SafeParseResult<v.GenericSchema>) {
  return result.issues?.[0]?.message;
}

test("試験: 下限が上限を超えるとエラー", () => {
  const result = v.safeParse(ExamGoalFieldsSchema, {
    content: "公式問題集を1回分解く",
    examDate: "2026-09-27",
    maxScore: 730,
    minScore: 850,
  });
  expect(result.success).toBe(false);
  expect(firstIssue(result)).toBe(TOEIC_SCORE_ORDER_MESSAGE);
});

test("試験: スコアは 10〜990 の範囲", () => {
  const result = v.safeParse(ExamGoalFieldsSchema, {
    content: "公式問題集を1回分解く",
    examDate: "2026-09-27",
    maxScore: 1200,
    minScore: 730,
  });
  expect(firstIssue(result)).toBe(TOEIC_SCORE_RANGE_MESSAGE);
});

test("試験: スコアは5点刻み", () => {
  const result = v.safeParse(ExamGoalFieldsSchema, {
    content: "公式問題集を1回分解く",
    examDate: "2026-09-27",
    maxScore: 850,
    minScore: 731,
  });
  expect(firstIssue(result)).toBe(TOEIC_SCORE_STEP_MESSAGE);
});

test("試験: 本番日は YYYY-MM-DD 以外を弾く", () => {
  const result = v.safeParse(ExamGoalFieldsSchema, {
    content: "公式問題集を1回分解く",
    examDate: "2026/09/27",
    maxScore: 850,
    minScore: 730,
  });
  expect(result.success).toBe(false);
});

test("新規長期目標: 期限キーを持たない(期限欄を出さない確定事項)", () => {
  expect(Object.keys(LongTermGoalFieldsSchema.entries)).toEqual(["content", "criterion"]);
});

test("新規長期目標: 達成の基準が空ならエラー", () => {
  const result = v.safeParse(LongTermGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "   ",
  });
  expect(result.success).toBe(false);
  expect(firstIssue(result)).toBe(MASTERY_CRITERION_MESSAGE);
});

test("新規チェックポイント: 期限と親が必須", () => {
  const missingDeadline = v.safeParse(CheckpointGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "",
    parentGoalId: "parent",
  });
  expect(missingDeadline.success).toBe(false);

  const missingParent = v.safeParse(CheckpointGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
    parentGoalId: "",
  });
  expect(missingParent.success).toBe(false);
  expect(firstIssue(missingParent)).toBe(CHECKPOINT_PARENT_REQUIRED_MESSAGE);
});

test("新規チェックポイント: 期限と親が揃えば通る", () => {
  const result = v.safeParse(CheckpointGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
    parentGoalId: "parent",
  });
  expect(result.success).toBe(true);
});

test("編集: 期限は空欄なら undefined に畳む", () => {
  const output = v.parse(MasteryEditFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "",
    parentGoalId: "",
  });
  expect(output.deadline).toBeUndefined();
});

test("編集: 期限と親の片方だけなら parentGoalId にエラーが付く(INV-1)", () => {
  const deadlineOnly = v.safeParse(MasteryEditFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
    parentGoalId: "",
  });
  expect(deadlineOnly.success).toBe(false);
  expect(deadlineOnly.issues?.[0]?.path?.[0]?.key).toBe("parentGoalId");
  expect(firstIssue(deadlineOnly)).toBe(CHECKPOINT_PARENT_REQUIRED_MESSAGE);

  const parentOnly = v.safeParse(MasteryEditFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "",
    parentGoalId: "parent",
  });
  expect(parentOnly.success).toBe(false);
});

test("編集: 期限は空欄以外なら日付形式を検証する", () => {
  const result = v.safeParse(MasteryEditFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026/09/20",
    parentGoalId: "parent",
  });
  expect(result.success).toBe(false);
});

test("送信ペイロードは type で分岐する2枝の union になる", () => {
  const result = v.safeParse(GoalSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
    parentGoalId: "parent",
    type: "mastery",
  });
  expect(result.success).toBe(true);
  expect(result.output).toEqual({
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
    parentGoalId: "parent",
    type: "mastery",
  });
});

test.each(["pace", "volume", "other"])("廃止した目標タイプ %s は union に無い", (type) => {
  const result = v.safeParse(GoalSchema, {
    content: "帰宅後に Distinction を1セット解く",
    criterion: "止まらずに音読できる",
    deadline: "",
    type,
  });
  expect(result.success).toBe(false);
});
