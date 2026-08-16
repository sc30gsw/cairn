import { expect, test } from "vite-plus/test";

import {
  buildWeeklyTrendChartData,
  weeklyTrendGoalReferenceLine,
} from "~/features/goals/lib/weekly-trend-chart-data";
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

test("記録もゴールもない週は除外し、古い→新しい順に並べ替える", () => {
  const weeks = [
    makeWeek({
      achieved: true,
      goalMinutes: 300,
      volumeMinutes: 320,
      weekEnd: "2026-08-16",
      weekStart: "2026-08-10",
    }),
    makeWeek({
      goalMinutes: null,
      volumeMinutes: 0,
      weekEnd: "2026-08-09",
      weekStart: "2026-08-03",
    }),
    makeWeek({
      achieved: false,
      goalMinutes: 300,
      volumeMinutes: 100,
      weekEnd: "2026-08-02",
      weekStart: "2026-07-27",
    }),
  ];
  const data = buildWeeklyTrendChartData(weeks);
  expect(data).toEqual([
    { label: "7/27〜8/2", 他: 100, 達成: null },
    { label: "8/10〜8/16", 他: null, 達成: 320 },
  ]);
});

test("ゴール未設定でも記録があれば「他」に入る", () => {
  const weeks = [makeWeek({ goalMinutes: null, volumeMinutes: 50 })];
  expect(buildWeeklyTrendChartData(weeks)).toEqual([{ label: "8/10〜8/16", 他: 50, 達成: null }]);
});

test("直近の完了週のゴール分数を目安線として返す", () => {
  const weeks = [makeWeek({ goalMinutes: 300 }), makeWeek({ goalMinutes: 200 })];
  expect(weeklyTrendGoalReferenceLine(weeks)).toBe(300);
});

test("直近の完了週がゴール未設定なら null", () => {
  const weeks = [makeWeek({ goalMinutes: null }), makeWeek({ goalMinutes: 200 })];
  expect(weeklyTrendGoalReferenceLine(weeks)).toBeNull();
});

test("週が空なら null", () => {
  expect(weeklyTrendGoalReferenceLine([])).toBeNull();
});
