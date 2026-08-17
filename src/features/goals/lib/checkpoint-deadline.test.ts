import { expect, test } from "vite-plus/test";

import { nextSundayJst } from "~/features/goals/lib/checkpoint-deadline";

test.each([
  ["2026-08-17", "2026-08-23"],
  ["2026-08-22", "2026-08-23"],
  ["2026-08-19", "2026-08-23"],
])("%s の次の日曜は %s", (todayJst, expected) => {
  expect(nextSundayJst(todayJst)).toBe(expected);
});

test("今日が日曜なら翌週の日曜を返す", () => {
  expect(nextSundayJst("2026-08-23")).toBe("2026-08-30");
});
