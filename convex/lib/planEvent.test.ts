import { expect, test } from "vite-plus/test";

import {
  planPriorityFromGoogleColorId,
  planWindowFromScheduleInstants,
  planMinuteToScheduleInstant,
} from "./planEvent";

test("同じ日の開始と終了を分に直す", () => {
  expect(planWindowFromScheduleInstants("2026-08-17 09:00:00", "2026-08-17 10:30:00")).toEqual({
    dateJst: "2026-08-17",
    endMinute: 630,
    startMinute: 540,
  });
});

test("翌日 00:00 は同じ日の 24:00 として扱う", () => {
  expect(planWindowFromScheduleInstants("2026-08-17 23:00:00", "2026-08-18 00:00:00")).toEqual({
    dateJst: "2026-08-17",
    endMinute: 1440,
    startMinute: 1380,
  });
  expect(planMinuteToScheduleInstant("2026-08-17", 1440)).toBe("2026-08-18 00:00:00");
});

test("日跨ぎは移せない", () => {
  expect(planWindowFromScheduleInstants("2026-08-17 23:00:00", "2026-08-18 01:00:00")).toBeNull();
});

test("Google 色 5 / 2 / 8 だけを優先度に写す", () => {
  expect(planPriorityFromGoogleColorId("5")).toBe("high");
  expect(planPriorityFromGoogleColorId("2")).toBe("medium");
  expect(planPriorityFromGoogleColorId("8")).toBe("low");
  expect(planPriorityFromGoogleColorId("10")).toBe("medium");
});
