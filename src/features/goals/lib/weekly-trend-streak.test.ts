import { expect, test } from "vite-plus/test";

import { currentStreak } from "~/features/goals/lib/weekly-trend-streak";
import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

function makeWeek(overrides: Partial<WeeklyTrendWeeks[number]>): WeeklyTrendWeeks[number] {
  return {
    achieved: false,
    goalMinutes: null,
    volumeMinutes: 0,
    weekEnd: "2026-08-16",
    weekStart: "2026-08-10",
    ...overrides,
  };
}

test("先頭から達成が続く分だけ数える", () => {
  const weeks = [
    makeWeek({ achieved: true, goalMinutes: 300, volumeMinutes: 320 }),
    makeWeek({ achieved: true, goalMinutes: 300, volumeMinutes: 305 }),
    makeWeek({ achieved: false, goalMinutes: 300, volumeMinutes: 100 }),
    makeWeek({ achieved: true, goalMinutes: 300, volumeMinutes: 400 }),
  ];
  expect(currentStreak(weeks)).toBe(2);
});

test("直近の完了週が未達ならストリークは 0", () => {
  const weeks = [
    makeWeek({ achieved: false, goalMinutes: 300, volumeMinutes: 100 }),
    makeWeek({ achieved: true, goalMinutes: 300, volumeMinutes: 400 }),
  ];
  expect(currentStreak(weeks)).toBe(0);
});

test("ゴール未設定週でストリークは途切れる", () => {
  const weeks = [
    makeWeek({ achieved: true, goalMinutes: 300, volumeMinutes: 320 }),
    makeWeek({ goalMinutes: null, volumeMinutes: 200 }),
    makeWeek({ achieved: true, goalMinutes: 300, volumeMinutes: 400 }),
  ];
  expect(currentStreak(weeks)).toBe(1);
});

test("空配列は 0", () => {
  expect(currentStreak([])).toBe(0);
});
