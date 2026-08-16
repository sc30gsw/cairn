import { expect, test } from "vite-plus/test";

import {
  calendarDayClassName,
  calendarDayProps,
  calendarDayStyleClasses,
} from "~/lib/calendar-day-style";

test("平日は className なし", () => {
  expect(calendarDayClassName("2026-08-17")).toBeUndefined();
  expect(calendarDayProps("2026-08-17")).toEqual({});
});

test("土曜は青マーカー", () => {
  expect(calendarDayClassName("2026-08-15")).toBe(calendarDayStyleClasses.saturdayDay);
});

test("日曜は赤マーカー", () => {
  expect(calendarDayClassName("2026-08-16")).toBe(calendarDayStyleClasses.sundayDay);
});

test("祝日は赤マーカーと title", () => {
  expect(calendarDayClassName("2026-11-03")).toBe(calendarDayStyleClasses.holidayDay);
  expect(calendarDayProps("2026-11-03")).toEqual({
    className: calendarDayStyleClasses.holidayDay,
    title: "文化の日",
  });
});

test("今日は週末でも className を付けない", () => {
  expect(calendarDayClassName("2026-08-15", "2026-08-15")).toBeUndefined();
  expect(calendarDayProps("2026-08-15", "2026-08-15")).toEqual({});
});
