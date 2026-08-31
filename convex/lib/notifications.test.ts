import { expect, test } from "vite-plus/test";

import {
  CHECKPOINT_NEAR_DAYS,
  deadlineDaysLeft,
  dueFixedTriggers,
  hourJst,
  isDeadlineNear,
  notificationDedupeKey,
  nowJst,
} from "./notifications";

function jstInstant(year: number, month: number, day: number, hour: number): number {
  return Date.UTC(year, month - 1, day, hour - 9, 0, 0);
}

test("固定時刻トリガーは 08時で期限接近だけ、土曜09時で週間ターゲットだけ発火する", () => {
  expect(dueFixedTriggers("2026-08-20", 8)).toEqual({
    checkpointDeadline: true,
    weeklyTargetMiss: false,
  });
  expect(dueFixedTriggers("2026-08-22", 9)).toEqual({
    checkpointDeadline: false,
    weeklyTargetMiss: true,
  });
  expect(dueFixedTriggers("2026-08-23", 9)).toEqual({
    checkpointDeadline: false,
    weeklyTargetMiss: false,
  });
  expect(dueFixedTriggers("2026-08-22", 21)).toEqual({
    checkpointDeadline: false,
    weeklyTargetMiss: false,
  });
});

test("期限接近の窓は残り0〜3日。超過(-1)と4日先は入らない", () => {
  expect(CHECKPOINT_NEAR_DAYS).toBe(3);
  expect(isDeadlineNear("2026-08-20", "2026-08-19")).toBe(false);
  expect(isDeadlineNear("2026-08-20", "2026-08-20")).toBe(true);
  expect(isDeadlineNear("2026-08-20", "2026-08-23")).toBe(true);
  expect(isDeadlineNear("2026-08-20", "2026-08-24")).toBe(false);
});

test("残り日数は暦日差をそのまま返す(超過は負)", () => {
  expect(deadlineDaysLeft("2026-08-20", "2026-08-19")).toBe(-1);
  expect(deadlineDaysLeft("2026-08-20", "2026-08-20")).toBe(0);
  expect(deadlineDaysLeft("2026-08-20", "2026-08-23")).toBe(3);
});

test("JST の時は 0〜23 で出る。深夜0時は 0 で、24 にはならない", () => {
  expect(hourJst(jstInstant(2026, 8, 20, 0))).toBe(0);
  expect(hourJst(jstInstant(2026, 8, 20, 9))).toBe(9);
  expect(hourJst(jstInstant(2026, 8, 20, 23))).toBe(23);
});

test("15:00 UTC は翌日00時 JST として扱われる(日付境界)", () => {
  expect(nowJst(Date.UTC(2026, 7, 19, 15, 0, 0))).toEqual({
    dateJst: "2026-08-20",
    hourJst: 0,
  });
  expect(nowJst(Date.UTC(2026, 7, 19, 14, 59, 0))).toEqual({
    dateJst: "2026-08-19",
    hourJst: 23,
  });
});

test("dedupeKey は日次トリガーが暦日、週次トリガーが週開始日で1本になる", () => {
  expect(
    notificationDedupeKey({ dateJst: "2026-08-20", items: [], kind: "checkpointDeadline" }),
  ).toBe("checkpointDeadline:2026-08-20");
  expect(
    notificationDedupeKey({
      dateJst: "2026-08-20",
      kind: "eveningUntouched",
      pendingCount: 2,
      source: "day",
    }),
  ).toBe("eveningUntouched:2026-08-20");
  expect(
    notificationDedupeKey({
      kind: "weeklyTargetMiss",
      shortfalls: [],
      weekStartJst: "2026-08-17",
    }),
  ).toBe("weeklyTargetMiss:2026-08-17");
});
