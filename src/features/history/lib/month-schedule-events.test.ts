import { expect, test } from "vite-plus/test";

import { toMonthScheduleEvents } from "~/features/history/lib/month-schedule-events";

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
