import { expect, test } from "vite-plus/test";

import {
  scheduleEventDateJst,
  toMonthScheduleEvents,
} from "~/features/history/lib/month-schedule-events";

test("ステータス色付きの schedule events に変換", () => {
  const events = toMonthScheduleEvents([
    {
      category: "多聴",
      dateJst: "2026-08-17",
      minutes: 30,
      rowId: "r1" as never,
      status: "確定",
      title: "Distinction 2000",
    },
  ]);
  expect(events[0]).toMatchObject({
    color: "blue",
    id: "r1",
    start: "2026-08-17 00:00:00",
    title: "Distinction 2000",
  });
});

test("未着手と見送りは MonthView に載せない", () => {
  const events = toMonthScheduleEvents([
    {
      category: "多聴",
      dateJst: "2026-08-17",
      minutes: 30,
      rowId: "r1" as never,
      status: "確定",
      title: "Distinction 2000",
    },
    {
      category: "英会話",
      dateJst: "2026-08-17",
      minutes: 20,
      rowId: "r2" as never,
      status: "未着手",
      title: "英会話",
    },
    {
      category: "多読",
      dateJst: "2026-08-17",
      minutes: 10,
      rowId: "r3" as never,
      status: "スキップ",
      title: "多読",
    },
  ]);
  expect(events).toHaveLength(1);
  expect(events[0]?.title).toBe("Distinction 2000");
});

test("scheduleEventDateJst は start から JST 日付を取る", () => {
  expect(scheduleEventDateJst({ start: "2026-08-17 00:00:00" })).toBe("2026-08-17");
});
