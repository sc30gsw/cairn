import { expect, test } from "vite-plus/test";

import { completedCount, confirmedRatio } from "./completionRate";

test("completedCount は4つの状態の和になる", () => {
  expect(completedCount({ confirmed: 3, leftover: 2, ongoing: 1, skipped: 4 })).toBe(10);
});

test("confirmedRatio は確定 / 並んだ件数", () => {
  expect(confirmedRatio({ confirmed: 3, leftover: 1, ongoing: 0, skipped: 0 })).toBeCloseTo(0.75);
});

test("confirmedRatio は並んだ件数0でゼロ除算せず0を返す", () => {
  expect(confirmedRatio({ confirmed: 0, leftover: 0, ongoing: 0, skipped: 0 })).toBe(0);
});
