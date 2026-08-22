import { expect, test } from "vite-plus/test";

import {
  dateToScheduleInstant,
  formatScheduleTimeLabel,
  scheduleInstantToDate,
} from "~/features/board/lib/schedule-instant";

test("dateToScheduleInstant formats wall clock in JST", () => {
  const utcMidnight = new Date("2026-08-17T15:00:00.000Z");

  expect(dateToScheduleInstant(utcMidnight)).toBe("2026-08-18 00:00:00");
});

test("scheduleInstantToDate parses JST wall clock", () => {
  const date = scheduleInstantToDate("2026-08-18 09:30:00");

  expect(date.toISOString()).toBe("2026-08-18T00:30:00.000Z");
});

test("schedule instant round trip preserves JST wall clock", () => {
  const original = new Date("2026-08-18T01:15:00.000Z");
  const instant = dateToScheduleInstant(original);

  expect(instant).toBe("2026-08-18 10:15:00");
  expect(dateToScheduleInstant(scheduleInstantToDate(instant))).toBe(instant);
});

test("formatScheduleTimeLabel returns HH:mm from string or Date", () => {
  expect(formatScheduleTimeLabel("2026-08-23 11:00:00")).toBe("11:00");
  expect(formatScheduleTimeLabel(scheduleInstantToDate("2026-08-23 11:00:00"))).toBe("11:00");
});
