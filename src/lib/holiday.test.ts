import { expect, test } from "vite-plus/test";

import { holidayName } from "~/lib/holiday";

test("文化の日を返す", () => {
  expect(holidayName("2026-11-03")).toBe("文化の日");
});

test("平日は null", () => {
  expect(holidayName("2026-08-17")).toBeNull();
});
