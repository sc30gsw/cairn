import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { DaySearchSchema } from "~/features/today/schemas/day-search-schema";

test("preset が空文字なら未指定として扱う", () => {
  const result = v.safeParse(DaySearchSchema, { preset: "" });
  expect(result.success).toBe(true);
  expect(result.success && result.output.preset).toBeUndefined();
});

test("preset が省略されていれば未指定のまま", () => {
  const result = v.safeParse(DaySearchSchema, {});
  expect(result.success).toBe(true);
  expect(result.success && result.output.preset).toBeUndefined();
});

test("preset に文字列が入っていればそのまま通す", () => {
  const result = v.safeParse(DaySearchSchema, { preset: "preset-1" });
  expect(result.success).toBe(true);
  expect(result.success && result.output.preset).toBe("preset-1");
});
