import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import {
  scheduleEventDateJst,
  toMonthScheduleEvents,
} from "~/features/history/lib/month-schedule-events";
import type { MonthEvent } from "~/features/history/types/history";

const [confirmed, pending, skipped] = STATUSES;

test("ステータス色付きの schedule events に変換", () => {
  const input = [
    {
      category: "多聴",
      dateJst: "2026-08-17",
      minutes: 30,
      rowId: "r1" as never,
      status: confirmed,
      title: "Distinction 2000",
    },
  ] as const satisfies readonly MonthEvent[];

  const events = toMonthScheduleEvents([...input]);
  expect(events[0]).toMatchObject({
    color: "green",
    id: "r1",
    start: "2026-08-17 00:00:00",
    title: "Distinction 2000",
  });
});

test("未着手と見送りは MonthView に載せない", () => {
  const input = [
    {
      category: "多聴",
      dateJst: "2026-08-17",
      minutes: 30,
      rowId: "r1" as never,
      status: confirmed,
      title: "Distinction 2000",
    },
    {
      category: "英会話",
      dateJst: "2026-08-17",
      minutes: 20,
      rowId: "r2" as never,
      status: pending,
      title: "英会話",
    },
    {
      category: "多読",
      dateJst: "2026-08-17",
      minutes: 10,
      rowId: "r3" as never,
      status: skipped,
      title: "多読",
    },
  ] as const satisfies readonly MonthEvent[];

  const events = toMonthScheduleEvents([...input]);
  expect(events).toHaveLength(1);
  expect(events[0]?.title).toBe("Distinction 2000");
});

test("scheduleEventDateJst は start から JST 日付を取る", () => {
  expect(scheduleEventDateJst({ start: "2026-08-17 00:00:00" })).toBe("2026-08-17");
});
