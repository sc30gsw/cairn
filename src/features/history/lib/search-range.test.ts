import { expect, test } from "vite-plus/test";

import { searchFromJst } from "~/features/history/lib/search-range";

test("12か月は前年同月の月初から、全期間は下限なし", () => {
  expect(searchFromJst("year", "2026-09-02")).toBe("2025-09-01");
  expect(searchFromJst("year", "2026-01-31")).toBe("2025-01-01");
  expect(searchFromJst("all", "2026-09-02")).toBeUndefined();
});
