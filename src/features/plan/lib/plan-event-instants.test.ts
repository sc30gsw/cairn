import { expect, test } from "vite-plus/test";

import { instantsToPlanTimes, planTimesToInstants } from "~/features/plan/lib/plan-event-instants";

test("24:00 は翌日 00:00:00 の instant になる", () => {
  expect(planTimesToInstants("2026-09-21", "22:00", "24:00")).toEqual({
    endAt: "2026-09-22 00:00:00",
    startAt: "2026-09-21 22:00:00",
  });
});

test("翌日 00:00 の終了は 24:00 に戻る", () => {
  expect(instantsToPlanTimes("2026-09-21 22:00:00", "2026-09-22 00:00:00")).toEqual({
    dateJst: "2026-09-21",
    endTime: "24:00",
    startTime: "22:00",
  });
});

test("日跨ぎの overnight は null", () => {
  expect(instantsToPlanTimes("2026-09-21 22:00:00", "2026-09-22 01:00:00")).toBeNull();
});
