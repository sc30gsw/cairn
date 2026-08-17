import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import {
  ExamGoalFieldsSchema,
  GoalSchema,
  MasteryGoalFieldsSchema,
  OtherGoalFieldsSchema,
  PaceGoalFieldsSchema,
  TOEIC_SCORE_ORDER_MESSAGE,
  TOEIC_SCORE_RANGE_MESSAGE,
  TOEIC_SCORE_STEP_MESSAGE,
  VolumeGoalFieldsSchema,
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

test("ペース: 週の実施日数と最低分数を通す", () => {
  const result = v.safeParse(PaceGoalFieldsSchema, {
    content: "帰宅後に Distinction を1セット解く",
    dailyFloorMinutes: 20,
    daysPerWeek: 3,
  });
  expect(result.success).toBe(true);
});

test("ペース: 実施日数が8日以上ならエラー", () => {
  const result = v.safeParse(PaceGoalFieldsSchema, {
    content: "帰宅後に Distinction を1セット解く",
    dailyFloorMinutes: 20,
    daysPerWeek: 8,
  });
  expect(result.success).toBe(false);
});

test("達成量: 目標量は1以上", () => {
  const result = v.safeParse(VolumeGoalFieldsSchema, {
    content: "公式問題集を1回分ずつ解く",
    deadline: "2026-09-20",
    startAmount: 0,
    targetAmount: 0,
    unit: "回",
  });
  expect(result.success).toBe(false);
});

test("習得: 期限は空欄なら undefined に畳む", () => {
  const output = v.parse(MasteryGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "",
  });
  expect(output.deadline).toBeUndefined();
});

test("その他: メモは空欄なら undefined に畳む", () => {
  const output = v.parse(OtherGoalFieldsSchema, {
    content: "毎朝の英字ニュースを1本読む",
    deadline: "",
    memo: "   ",
  });
  expect(output.memo).toBeUndefined();
  expect(output.deadline).toBeUndefined();
});

test("その他: メモに内容があればそのまま残す", () => {
  const output = v.parse(OtherGoalFieldsSchema, {
    content: "毎朝の英字ニュースを1本読む",
    deadline: "2026-09-20",
    memo: "5分で十分",
  });
  expect(output.memo).toBe("5分で十分");
  expect(output.deadline).toBe("2026-09-20");
});

test("習得: 期限は空欄以外なら日付形式を検証する", () => {
  const result = v.safeParse(MasteryGoalFieldsSchema, {
    content: "Unit 1-10 を音読する",
    criterion: "止まらずに音読できる",
    deadline: "2026/09/20",
  });
  expect(result.success).toBe(false);
});

test("送信ペイロードは type で分岐する union になる", () => {
  const result = v.safeParse(GoalSchema, {
    content: "帰宅後に Distinction を1セット解く",
    dailyFloorMinutes: 20,
    daysPerWeek: 3,
    type: "pace",
  });
  expect(result.success).toBe(true);
  expect(result.output).toEqual({
    content: "帰宅後に Distinction を1セット解く",
    dailyFloorMinutes: 20,
    daysPerWeek: 3,
    type: "pace",
  });
});

test("日付は YYYY-MM-DD 以外を弾く", () => {
  const result = v.safeParse(VolumeGoalFieldsSchema, {
    content: "公式問題集を1回分ずつ解く",
    deadline: "2026/09/20",
    startAmount: 0,
    targetAmount: 10,
    unit: "回",
  });
  expect(result.success).toBe(false);
});
