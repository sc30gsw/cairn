import { expect, test } from "vite-plus/test";

import { shouldStripDatedDayPreset } from "~/features/today/lib/day-route-search";

test("過去日の preset search は除去する", () => {
  expect(shouldStripDatedDayPreset("2026-08-16", "preset-1", "2026-08-17")).toBe(true);
});

test("今日の preset search は維持する", () => {
  expect(shouldStripDatedDayPreset("2026-08-17", "preset-1", "2026-08-17")).toBe(false);
});

test("preset がなければ除去しない", () => {
  expect(shouldStripDatedDayPreset("2026-08-16", undefined, "2026-08-17")).toBe(false);
});
