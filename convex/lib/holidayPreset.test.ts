import { expect, test } from "vite-plus/test";

import { presetWeekdayFor } from "./holidayPreset";

const HOLIDAY_MONDAY = "2026-09-21";
const PLAIN_MONDAY = "2026-08-17";
const SUNDAY = "2026-09-20";

test("祝日を日曜扱いにする設定が有効なら、祝日の月曜は日曜のプリセットになる", () => {
  expect(presetWeekdayFor(HOLIDAY_MONDAY, { holidayAsSunday: true })).toBe(0);
});

test("設定が無効なら、祝日でも曜日どおり", () => {
  expect(presetWeekdayFor(HOLIDAY_MONDAY, { holidayAsSunday: false })).toBe(1);
});

test("祝日でない平日は設定に関わらず曜日どおり", () => {
  expect(presetWeekdayFor(PLAIN_MONDAY, { holidayAsSunday: true })).toBe(1);
  expect(presetWeekdayFor(PLAIN_MONDAY, { holidayAsSunday: false })).toBe(1);
});

test("日曜はそのまま日曜", () => {
  expect(presetWeekdayFor(SUNDAY, { holidayAsSunday: true })).toBe(0);
});
