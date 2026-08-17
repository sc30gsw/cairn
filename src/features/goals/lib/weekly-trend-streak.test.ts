import { expect, test } from "vite-plus/test";

import { currentStreak } from "~/features/goals/lib/weekly-trend-streak";
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

function achievedWeek(): WeeklyTrendWeek {
  return makeWeek({ achieved: true, dailyFloorMinutes: 20, goalDays: 3, qualifyingDays: 4 });
}

function missedWeek(): WeeklyTrendWeek {
  return makeWeek({ dailyFloorMinutes: 20, goalDays: 3, qualifyingDays: 1 });
}

test("先頭から達成が続く分だけ数える", () => {
  expect(currentStreak([achievedWeek(), achievedWeek()])).toEqual({
    length: 2,
    reserveUsed: false,
  });
});

test("未達1週は予備で吸収して連続を切らない", () => {
  expect(currentStreak([achievedWeek(), missedWeek(), achievedWeek()])).toEqual({
    length: 2,
    reserveUsed: true,
  });
});

test("2週連続の未達で切れる", () => {
  expect(currentStreak([achievedWeek(), missedWeek(), missedWeek(), achievedWeek()])).toEqual({
    length: 1,
    reserveUsed: true,
  });
});

test("ゴール未設定週でストリークは途切れる", () => {
  expect(currentStreak([achievedWeek(), makeWeek({}), achievedWeek()])).toEqual({
    length: 1,
    reserveUsed: false,
  });
});

test("直近が未達で連続が0なら予備を使ったことにしない", () => {
  expect(currentStreak([missedWeek()])).toEqual({ length: 0, reserveUsed: false });
  expect(currentStreak([missedWeek(), missedWeek(), achievedWeek()])).toEqual({
    length: 0,
    reserveUsed: false,
  });
});

test("空配列は 0", () => {
  expect(currentStreak([])).toEqual({ length: 0, reserveUsed: false });
});

test("全週達成なら配列の長さと同じ数を返す(12週上限の表示側判定に使う)", () => {
  const weeks = Array.from({ length: 12 }, () => achievedWeek());
  expect(currentStreak(weeks)).toEqual({ length: 12, reserveUsed: false });
});
