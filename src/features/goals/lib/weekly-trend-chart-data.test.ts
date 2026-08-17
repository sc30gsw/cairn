import { expect, test } from "vite-plus/test";

import { buildWeeklyTrendChartData } from "~/features/goals/lib/weekly-trend-chart-data";
import type { WeeklyTrendWeek } from "~/features/goals/types/goal";

function makeWeek(overrides: Partial<WeeklyTrendWeek>): WeeklyTrendWeek {
  return {
    achieved: false,
    dailyFloorMinutes: null,
    goalDays: null,
    qualifyingDays: 0,
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
      dailyFloorMinutes: 20,
      goalDays: 3,
      qualifyingDays: 4,
      volumeMinutes: 320,
      weekEnd: "2026-08-16",
      weekStart: "2026-08-10",
    }),
    makeWeek({ weekEnd: "2026-08-09", weekStart: "2026-08-03" }),
    makeWeek({
      dailyFloorMinutes: 20,
      goalDays: 3,
      qualifyingDays: 1,
      volumeMinutes: 100,
      weekEnd: "2026-08-02",
      weekStart: "2026-07-27",
    }),
  ];

  expect(buildWeeklyTrendChartData(weeks)).toEqual([
    { label: "7/27〜8/2", qualifying: "実施日 1/3日", volumeMinutes: 100, 他: 100, 達成: null },
    { label: "8/10〜8/16", qualifying: "実施日 4/3日", volumeMinutes: 320, 他: null, 達成: 320 },
  ]);
});

test("ゴール未設定でも記録があれば「他」に入る", () => {
  expect(buildWeeklyTrendChartData([makeWeek({ volumeMinutes: 50 })])).toEqual([
    { label: "8/10〜8/16", qualifying: "実施日 0日", volumeMinutes: 50, 他: 50, 達成: null },
  ]);
});

test("週が空なら空配列", () => {
  expect(buildWeeklyTrendChartData([])).toEqual([]);
});
