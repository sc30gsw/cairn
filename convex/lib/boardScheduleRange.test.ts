import { expect, test } from "vite-plus/test";

import { scheduleListRange } from "./boardScheduleRange";

test("scheduleListRange returns day span", () => {
  expect(scheduleListRange("day", "2026-08-17")).toEqual({
    rangeEndExclusive: "2026-08-18 00:00:00",
    rangeStart: "2026-08-17 00:00:00",
  });
});

test("scheduleListRange returns week span from Monday", () => {
  expect(scheduleListRange("week", "2026-08-19")).toEqual({
    rangeEndExclusive: "2026-08-24 00:00:00",
    rangeStart: "2026-08-17 00:00:00",
  });
});

test("scheduleListRange returns month span", () => {
  expect(scheduleListRange("month", "2026-08-01")).toEqual({
    rangeEndExclusive: "2026-09-01 00:00:00",
    rangeStart: "2026-08-01 00:00:00",
  });
});

test("scheduleListRange returns year span", () => {
  expect(scheduleListRange("year", "2026-01-01")).toEqual({
    rangeEndExclusive: "2027-01-01 00:00:00",
    rangeStart: "2026-01-01 00:00:00",
  });
});
