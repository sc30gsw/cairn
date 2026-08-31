import { expect, test } from "vite-plus/test";

import {
  dailyAverageMinutes,
  deltaDirection,
  digestCellLabel,
  monthDayLabel,
  percentOf,
  previousWeekLabel,
  weekdayShortLabel,
  weekRangeLabel,
} from "~/features/review/lib/weekly-review-labels";

test("weekdayShortLabel は WEEKDAY_NAMES の1文字目", () => {
  expect(weekdayShortLabel("2026-08-17")).toBe("月");
  expect(weekdayShortLabel("2026-08-22")).toBe("土");
  expect(weekdayShortLabel("2026-08-23")).toBe("日");
});

test("monthDayLabel は MM/DD", () => {
  expect(monthDayLabel("2026-08-17")).toBe("08/17");
});

test("weekRangeLabel は同じ月なら第n週つき", () => {
  expect(weekRangeLabel("2026-08-17", "2026-08-23")).toBe("8月第3週（08/17 月 〜 08/23 日）");
  expect(weekRangeLabel("2026-08-03", "2026-08-09")).toBe("8月第1週（08/03 月 〜 08/09 日）");
});

test("weekRangeLabel は月をまたぐ週なら範囲だけ", () => {
  expect(weekRangeLabel("2026-08-31", "2026-09-06")).toBe("08/31 月 〜 09/06 日");
});

test("previousWeekLabel は増・減・同で符号を変える", () => {
  expect(previousWeekLabel(620, 540, "分")).toBe("先週 540分（+80分）");
  expect(previousWeekLabel(500, 540, "分")).toBe("先週 540分（-40分）");
  expect(previousWeekLabel(540, 540, "分")).toBe("先週 540分（±0分）");
});

test("previousWeekLabel は前週0なら記録なしと言う", () => {
  expect(previousWeekLabel(620, 0, "分")).toBe("先週の記録はありません");
});

test("deltaDirection は増減を3値で返す", () => {
  expect(deltaDirection(2, 1)).toBe("up");
  expect(deltaDirection(1, 2)).toBe("down");
  expect(deltaDirection(1, 1)).toBe("flat");
});

test("dailyAverageMinutes は経過日数で割り、0日なら0", () => {
  expect(dailyAverageMinutes(620, 7)).toBe(89);
  expect(dailyAverageMinutes(620, 0)).toBe(0);
});

test("percentOf は超過を100で止め、分母0なら0", () => {
  expect(percentOf(180, 120)).toBe(100);
  expect(percentOf(2, 4)).toBe(50);
  expect(percentOf(2, 0)).toBe(0);
});

test("digestCellLabel は4分岐を書き分ける", () => {
  expect(
    digestCellLabel(
      { confirmedCount: 4, dateJst: "2026-08-17", digestRate: 0.8, plannedCount: 5 },
      "2026-08-23",
    ),
  ).toBe("4/5（80%）");
  expect(
    digestCellLabel(
      { confirmedCount: 1, dateJst: "2026-08-23", digestRate: null, plannedCount: 1 },
      "2026-08-23",
    ),
  ).toBe("—（今日）");
  expect(
    digestCellLabel(
      { confirmedCount: 0, dateJst: "2026-08-18", digestRate: null, plannedCount: 0 },
      "2026-08-23",
    ),
  ).toBe("—");
});
