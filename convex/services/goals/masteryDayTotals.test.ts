import { expect, test } from "vite-plus/test";

import {
  activeDayDelta,
  confirmedDayTotals,
  EMPTY_DAY_TOTALS,
  initialMasteryProgress,
} from "./masteryDayTotals";

test("確定だけを数え、ゴミ箱の記録と確定以外は外す", () => {
  expect(
    confirmedDayTotals(
      [
        { deletedAt: undefined, minutes: 30, status: "確定" },
        { deletedAt: undefined, minutes: 20, status: "確定" },
        { deletedAt: undefined, minutes: 999, status: "未着手" },
        { deletedAt: undefined, minutes: 999, status: "スキップ" },
        { deletedAt: 1, minutes: 999, status: "確定" },
      ],
      true,
    ),
  ).toEqual({ confirmedCount: 2, confirmedMinutes: 50 });
});

test("日がゴミ箱にあるとその暦日は丸ごと0になる", () => {
  expect(
    confirmedDayTotals([{ deletedAt: undefined, minutes: 30, status: "確定" }], false),
  ).toEqual(EMPTY_DAY_TOTALS);
});

test("0分の確定でも件数は数える(実施日は分数ではなく件数で決まる)", () => {
  expect(confirmedDayTotals([{ deletedAt: undefined, minutes: 0, status: "確定" }], true)).toEqual({
    confirmedCount: 1,
    confirmedMinutes: 0,
  });
});

test("実施日数は 0↔正 の遷移でだけ ±1 する", () => {
  expect(activeDayDelta(0, 1)).toBe(1);
  expect(activeDayDelta(1, 0)).toBe(-1);
  expect(activeDayDelta(1, 2)).toBe(0);
  expect(activeDayDelta(2, 1)).toBe(0);
  expect(activeDayDelta(0, 0)).toBe(0);
});

test("作成日の実績は実施日1日ぶんに丸める", () => {
  expect(initialMasteryProgress({ confirmedCount: 2, confirmedMinutes: 50 })).toEqual({
    activeDays: 1,
    confirmedMinutes: 50,
  });
  expect(initialMasteryProgress(EMPTY_DAY_TOTALS)).toEqual({
    activeDays: 0,
    confirmedMinutes: 0,
  });
});
