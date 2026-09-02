import { expect, test } from "vite-plus/test";

import { normalizeReflection } from "./achievementReflection";
import { ACHIEVEMENT_REFLECTION_MAX_LENGTH } from "./domain";

test("前後の空白を落とす", () => {
  expect(normalizeReflection("  毎朝の音読が効いた  ")).toBe("毎朝の音読が効いた");
});

test("空と空白だけは無しになる", () => {
  expect(normalizeReflection("")).toBeUndefined();
  expect(normalizeReflection("   ")).toBeUndefined();
  expect(normalizeReflection(undefined)).toBeUndefined();
});

test("上限を超えると拒否する", () => {
  expect(() => normalizeReflection("あ".repeat(ACHIEVEMENT_REFLECTION_MAX_LENGTH + 1))).toThrow();
  expect(normalizeReflection("あ".repeat(ACHIEVEMENT_REFLECTION_MAX_LENGTH))).toHaveLength(
    ACHIEVEMENT_REFLECTION_MAX_LENGTH,
  );
});
