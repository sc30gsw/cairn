import * as v from "valibot";
import { expect, test } from "vite-plus/test";
import { ACHIEVEMENT_REFLECTION_MAX_LENGTH } from "~domain/domain";

import { AchievementReflectionSchema } from "~/features/goals/schemas/achievement-reflection-schema";

test("空の振り返りは通る（任意）", () => {
  const result = v.safeParse(AchievementReflectionSchema, { reflection: "" });
  expect(result.success).toBe(true);
});

test("前後の空白を落として通す", () => {
  const result = v.safeParse(AchievementReflectionSchema, { reflection: "  効いた  " });
  expect(result.success && result.output.reflection).toBe("効いた");
});

test("上限を超えると通らない", () => {
  const result = v.safeParse(AchievementReflectionSchema, {
    reflection: "あ".repeat(ACHIEVEMENT_REFLECTION_MAX_LENGTH + 1),
  });
  expect(result.success).toBe(false);
});
