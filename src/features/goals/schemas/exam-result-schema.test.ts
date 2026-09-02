import * as v from "valibot";
import { expect, test } from "vite-plus/test";
import {
  GOAL_DATE_MESSAGE,
  TOEIC_SCORE_RANGE_MESSAGE,
  TOEIC_SCORE_STEP_MESSAGE,
} from "~domain/domain";

import { ExamResultSchema } from "~/features/goals/schemas/exam-result-schema";

function firstMessage(input: unknown): string | undefined {
  const result = v.safeParse(ExamResultSchema, input);
  return result.success ? undefined : result.issues[0]?.message;
}

test("スコア 10〜990 の 5 点刻みと YYYY-MM-DD の日付を受け付ける", () => {
  expect(v.safeParse(ExamResultSchema, { recordedAt: "2026-10-20", score: 855 }).success).toBe(
    true,
  );
});

test("範囲外・刻み違い・日付の形式違いはドメインの文言で拒否する", () => {
  expect(firstMessage({ recordedAt: "2026-10-20", score: 995 })).toBe(TOEIC_SCORE_RANGE_MESSAGE);
  expect(firstMessage({ recordedAt: "2026-10-20", score: 857 })).toBe(TOEIC_SCORE_STEP_MESSAGE);
  expect(firstMessage({ recordedAt: "2026/10/20", score: 855 })).toBe(GOAL_DATE_MESSAGE);
  expect(firstMessage({ recordedAt: "2026-10-20", score: undefined })).toBe(
    TOEIC_SCORE_RANGE_MESSAGE,
  );
});
