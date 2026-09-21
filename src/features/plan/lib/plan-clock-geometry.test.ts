import { expect, test } from "vite-plus/test";

import {
  clockArcPath,
  jstMinuteOfDay,
  minuteToAngle,
  paintsClockArc,
} from "~/features/plan/lib/plan-clock-geometry";
import type { PlanEventDto } from "~/features/plan/types/plan";

test("0分は真上、360分は3時の位置", () => {
  expect(minuteToAngle(0)).toBe(-90);
  expect(minuteToAngle(360)).toBe(0);
});

test("JST の 5:00 は 300 分", () => {
  expect(jstMinuteOfDay(new Date("2026-09-21T20:00:00.000Z"))).toBe(300);
});

test("短い弧は large-arc 0", () => {
  expect(clockArcPath(0, 0, 10, 0, 60)).toContain("A 10 10 0 0 1");
});

test("確定した項目つき予定だけ弧を塗る", () => {
  const confirmed = {
    itemId: "item-1",
    recordState: { kind: "materialized", status: "確定" },
  } as PlanEventDto;
  const confirmedWithoutItem = {
    recordState: { kind: "materialized", status: "確定" },
  } as PlanEventDto;
  const waiting = {
    itemId: "item-1",
    recordState: { kind: "awaiting-open" },
  } as PlanEventDto;
  const none = {
    recordState: { kind: "not-applicable" },
  } as PlanEventDto;
  expect(paintsClockArc(confirmed)).toBe(true);
  expect(paintsClockArc(confirmedWithoutItem)).toBe(false);
  expect(paintsClockArc(waiting)).toBe(false);
  expect(paintsClockArc(none)).toBe(false);
});
