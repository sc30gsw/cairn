import { expect, test } from "vite-plus/test";

import {
  qualifyingDaysLabel,
  recordedWeeks,
  shortDateLabel,
} from "~/features/goals/lib/weekly-trend-format";
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

test("shortDateLabel は月と日の先頭ゼロを落とす", () => {
  expect(shortDateLabel("2026-08-04")).toBe("8/4");
  expect(shortDateLabel("2026-01-05")).toBe("1/5");
  expect(shortDateLabel("2026-12-31")).toBe("12/31");
});

test("recordedWeeks はゴールも記録もない週だけを除く", () => {
  const withGoalOnly = makeWeek({ goalDays: 3, qualifyingDays: 0, volumeMinutes: 0 });
  const withVolumeOnly = makeWeek({ goalDays: null, volumeMinutes: 10 });
  const withNeither = makeWeek({});

  expect(recordedWeeks([withGoalOnly, withVolumeOnly, withNeither])).toEqual([
    withGoalOnly,
    withVolumeOnly,
  ]);
});

test("qualifyingDaysLabel はゴールが無ければ分母を出さない", () => {
  expect(qualifyingDaysLabel(makeWeek({ goalDays: null, qualifyingDays: 2 }))).toBe("実施日 2日");
});

test("qualifyingDaysLabel はゴールがあれば x/n で出す", () => {
  expect(qualifyingDaysLabel(makeWeek({ goalDays: 3, qualifyingDays: 1 }))).toBe("実施日 1/3日");
});
