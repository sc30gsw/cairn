import { Result } from "better-result";
import { expect, test } from "vite-plus/test";

import {
  GOAL_DATE_MESSAGE,
  MASTERY_CRITERION_MESSAGE,
  TOEIC_SCORE_ORDER_MESSAGE,
  TOEIC_SCORE_RANGE_MESSAGE,
  TOEIC_SCORE_STEP_MESSAGE,
} from "../../lib/domain";
import { validateGoalInput } from "./validateGoalInput";

test("試験: 下限スコアが範囲外ならエラー", () => {
  const result = validateGoalInput({
    content: "900点を取る",
    examDate: "2026-09-27",
    maxScore: 850,
    minScore: 5,
    type: "exam",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error.message).toBe(TOEIC_SCORE_RANGE_MESSAGE);
  }
});

test("試験: 上限スコアが範囲外ならエラー", () => {
  const result = validateGoalInput({
    content: "900点を取る",
    examDate: "2026-09-27",
    maxScore: 1000,
    minScore: 730,
    type: "exam",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error.message).toBe(TOEIC_SCORE_RANGE_MESSAGE);
  }
});

test("試験: スコア刻みが不正ならエラー", () => {
  const result = validateGoalInput({
    content: "900点を取る",
    examDate: "2026-09-27",
    maxScore: 851,
    minScore: 730,
    type: "exam",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error.message).toBe(TOEIC_SCORE_STEP_MESSAGE);
  }
});

test("試験: 下限が上限を超えるとエラー", () => {
  const result = validateGoalInput({
    content: "900点を取る",
    examDate: "2026-09-27",
    maxScore: 730,
    minScore: 850,
    type: "exam",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error.message).toBe(TOEIC_SCORE_ORDER_MESSAGE);
  }
});

test("試験: 本番日が不正ならエラー", () => {
  const result = validateGoalInput({
    content: "900点を取る",
    examDate: "2026/09/27",
    maxScore: 850,
    minScore: 730,
    type: "exam",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error.message).toBe(GOAL_DATE_MESSAGE);
  }
});

test("習得: 基準が空ならエラー", () => {
  const result = validateGoalInput({
    content: "Unit 1 を音読する",
    criterion: "   ",
    type: "mastery",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error.message).toBe(MASTERY_CRITERION_MESSAGE);
  }
});

test("習得: 期限が不正ならエラー", () => {
  const result = validateGoalInput({
    content: "Unit 1 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026/09/20",
    type: "mastery",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error.message).toBe(GOAL_DATE_MESSAGE);
  }
});

test("有効な入力は ok を返す", () => {
  const result = validateGoalInput({
    content: "Unit 1 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026-08-23",
    type: "mastery",
  });
  expect(Result.isOk(result)).toBe(true);
});
