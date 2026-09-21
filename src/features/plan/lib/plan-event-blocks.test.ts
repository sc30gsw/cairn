import { expect, test } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { toPlanScheduleBlocks } from "~/features/plan/lib/plan-event-blocks";
import type { PlanEventDto } from "~/features/plan/types/plan";

test("項目なし予定は弧用の記録を持たず、優先度から色を決める", () => {
  const event = {
    _id: "e1" as Id<"planEvents">,
    dateJst: "2026-09-25",
    endTime: "21:00",
    priority: "low",
    recordState: { kind: "not-applicable" },
    startTime: "20:00",
    title: "X を見る",
  } satisfies PlanEventDto;

  expect(toPlanScheduleBlocks([event])).toEqual([
    {
      _id: "e1",
      color: "gray",
      endAt: "2026-09-25 21:00:00",
      frozen: false,
      itemId: undefined,
      priority: "low",
      startAt: "2026-09-25 20:00:00",
      title: "X を見る",
    },
  ]);
});

test("記録を生やした予定は日付と項目を凍結する", () => {
  const event = {
    _id: "e2" as Id<"planEvents">,
    dateJst: "2026-09-21",
    endTime: "08:15",
    itemId: "item-1" as Id<"items">,
    priority: "high",
    recordState: { kind: "materialized", status: "確定" },
    startTime: "07:30",
    title: "Part 7",
  } satisfies PlanEventDto;

  expect(toPlanScheduleBlocks([event])[0]?.frozen).toBe(true);
  expect(toPlanScheduleBlocks([event])[0]?.color).toBe("yellow");
});
