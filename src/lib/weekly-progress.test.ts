import { expect, test } from "vite-plus/test";

import { computeWeeklyProgress } from "~/lib/weekly-progress";

test("週間ゴール未設定なら進捗0", () => {
  expect(
    computeWeeklyProgress({
      todayJst: "2026-08-17",
      volumeMinutes: 120,
      weekEndJst: "2026-08-23",
      weeklyGoalMinutes: null,
    }),
  ).toEqual({ dailyNeeded: 0, daysLeft: 1, percent: 0, remaining: 0 });
});

test("残り分数と1日あたり必要量を算出する", () => {
  expect(
    computeWeeklyProgress({
      todayJst: "2026-08-17",
      volumeMinutes: 100,
      weekEndJst: "2026-08-23",
      weeklyGoalMinutes: 300,
    }),
  ).toEqual({ dailyNeeded: 29, daysLeft: 7, percent: 33, remaining: 200 });
});
