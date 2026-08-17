import { expect, test } from "vite-plus/test";

import {
  computeWeeklyProgress,
  minutesByDateFromDays,
  minutesByDateFromRows,
} from "~/lib/weekly-progress";

test("週間ゴール未設定なら進捗0", () => {
  expect(
    computeWeeklyProgress({
      minutesByDate: { "2026-08-17": 120 },
      todayJst: "2026-08-17",
      weekEndJst: "2026-08-23",
      weeklyGoal: null,
    }),
  ).toEqual({
    daysLeft: 7,
    doneDays: 0,
    goalDays: 0,
    percent: 0,
    remainingDays: 0,
    todayMinutes: 120,
    todayReached: false,
    weekMinutes: 120,
  });
});

test("最低分数に届いた暦日だけを実施日として数える", () => {
  expect(
    computeWeeklyProgress({
      minutesByDate: { "2026-08-17": 30, "2026-08-18": 10, "2026-08-19": 20 },
      todayJst: "2026-08-17",
      weekEndJst: "2026-08-23",
      weeklyGoal: { dailyFloorMinutes: 20, days: 3 },
    }),
  ).toEqual({
    daysLeft: 7,
    doneDays: 2,
    goalDays: 3,
    percent: 67,
    remainingDays: 1,
    todayMinutes: 30,
    todayReached: true,
    weekMinutes: 60,
  });
});

test("確定行だけを暦日ごとに合計する", () => {
  expect(
    minutesByDateFromRows([
      { dateJst: "2026-08-17", minutes: 30, status: "確定" },
      { dateJst: "2026-08-17", minutes: 20, status: "スキップ" },
      { dateJst: "2026-08-18", minutes: 15, status: "確定" },
    ]),
  ).toEqual({ "2026-08-17": 30, "2026-08-18": 15 });
});

test("日別内訳から実施分数の辞書を作る", () => {
  expect(
    minutesByDateFromDays([
      { confirmedMinutes: 30, dateJst: "2026-08-17" },
      { confirmedMinutes: 0, dateJst: "2026-08-18" },
    ]),
  ).toEqual({ "2026-08-17": 30, "2026-08-18": 0 });
});
