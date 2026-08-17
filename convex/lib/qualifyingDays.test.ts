import { expect, test } from "vite-plus/test";

import { qualifyingDays } from "./qualifyingDays";

test("フロアちょうどの日は実施日として数える", () => {
  expect(qualifyingDays({ "2026-08-10": 30 }, 30)).toBe(1);
});

test("フロア未満の日は実施日に数えない", () => {
  expect(qualifyingDays({ "2026-08-10": 29 }, 30)).toBe(0);
});

test("複数日のうちフロアを満たす日だけ数える", () => {
  const minutesByDate = {
    "2026-08-10": 30,
    "2026-08-11": 15,
    "2026-08-12": 45,
    "2026-08-13": 0,
  };
  expect(qualifyingDays(minutesByDate, 30)).toBe(2);
});

test("記録が無ければ0", () => {
  expect(qualifyingDays({}, 30)).toBe(0);
});
