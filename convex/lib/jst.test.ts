import { expect, test } from "vite-plus/test";

import { addDaysJst, daysUntil, isFutureDateJst, mondayOfWeek, weekdayFromDateJst } from "./jst";

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
