import * as v from "valibot";
import { expect, test } from "vite-plus/test";
import {
  MASTERY_CRITERION_MESSAGE,
  TOEIC_SCORE_ORDER_MESSAGE,
  TOEIC_SCORE_RANGE_MESSAGE,
  TOEIC_SCORE_STEP_MESSAGE,
} from "~domain/domain";

import {
  ExamGoalFieldsSchema,
  GoalSchema,
  MasteryGoalFieldsSchema,
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

test("習得: 達成の基準が空ならエラー", () => {
  const result = v.safeParse(MasteryGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "   ",
    deadline: "",
  });
  expect(result.success).toBe(false);
  expect(firstIssue(result)).toBe(MASTERY_CRITERION_MESSAGE);
});

test("習得: 期限は空欄なら undefined に畳む", () => {
  const output = v.parse(MasteryGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "",
  });
  expect(output.deadline).toBeUndefined();
});

test("習得: 期限があればチェックポイントとしてそのまま残す", () => {
  const output = v.parse(MasteryGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
  });
  expect(output.deadline).toBe("2026-08-23");
});

test("習得: 期限は空欄以外なら日付形式を検証する", () => {
  const result = v.safeParse(MasteryGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026/09/20",
  });
  expect(result.success).toBe(false);
});

test("送信ペイロードは type で分岐する2枝の union になる", () => {
  const result = v.safeParse(GoalSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
    type: "mastery",
  });
  expect(result.success).toBe(true);
  expect(result.output).toEqual({
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
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
