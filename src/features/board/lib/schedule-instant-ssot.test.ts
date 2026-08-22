import { expect, test } from "vite-plus/test";
import { isScheduleInstant, SCHEDULE_INSTANT_PATTERN } from "~domain/scheduleInstant";

import { scheduleInstantToDate } from "~/features/board/lib/schedule-instant";

test("schedule instant pattern is shared between client and server", () => {
  expect(isScheduleInstant("2026-08-17 09:00:00")).toBe(true);
  expect(isScheduleInstant("2026-08-17T09:00:00")).toBe(false);
  expect(SCHEDULE_INSTANT_PATTERN.test("2026-08-17 09:00:00")).toBe(true);
  expect(() => scheduleInstantToDate("invalid")).toThrow(/Invalid schedule instant/);
});
