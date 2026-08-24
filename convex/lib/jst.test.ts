import { expect, test } from "vite-plus/test";

import {
  addDaysJst,
  addMonthsJst,
  daysUntil,
  isDateJst,
  isFutureDateJst,
  mondayOfWeek,
  weekdayFromDateJst,
} from "./jst";

test("isDateJst は YYYY-MM-DD の実在する暦日だけを通す", () => {
  expect(isDateJst("2026-08-17")).toBe(true);
  expect(isDateJst("2026-02-28")).toBe(true);
  //? 形式だけ正しく実在しない日は 3/3 に転がるので弾く
  expect(isDateJst("2026-02-31")).toBe(false);
  expect(isDateJst("2026/08/17")).toBe(false);
  expect(isDateJst("2026-8-17")).toBe(false);
  expect(isDateJst("いつか")).toBe(false);
  expect(isDateJst("")).toBe(false);
});

test("2026-08-15 は土曜", () => {
  expect(weekdayFromDateJst("2026-08-15")).toBe(6);
});

test("2026-08-17 は月曜", () => {
  expect(weekdayFromDateJst("2026-08-17")).toBe(1);
});

test("今日より後の暦日は未来", () => {
  expect(isFutureDateJst("2026-08-16", "2026-08-15")).toBe(true);
  expect(isFutureDateJst("2026-08-15", "2026-08-15")).toBe(false);
  expect(isFutureDateJst("2026-08-14", "2026-08-15")).toBe(false);
});

test("月曜始まりの週は土曜 2026-08-15 なら 2026-08-10", () => {
  expect(mondayOfWeek("2026-08-15")).toBe("2026-08-10");
});

test("本番日 2026-09-27 まで 2026-08-15 から 43 日", () => {
  expect(daysUntil("2026-08-15", "2026-09-27")).toBe(43);
});

test("1日進める", () => {
  expect(addDaysJst("2026-08-15", 1)).toBe("2026-08-16");
});

test("addMonthsJst は年をまたいで前後の月を返す", () => {
  expect(addMonthsJst("2026-01", -1)).toBe("2025-12");
  expect(addMonthsJst("2026-12", 1)).toBe("2027-01");
  expect(addMonthsJst("2026-08", 0)).toBe("2026-08");
});

test("addMonthsJst は12か月以上の移動も月を2桁に保つ", () => {
  expect(addMonthsJst("2026-08", -13)).toBe("2025-07");
  expect(addMonthsJst("2026-08", 5)).toBe("2027-01");
});
