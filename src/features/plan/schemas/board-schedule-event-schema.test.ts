import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import {
  PlanScheduleEventSchema,
  type PlanScheduleEventOutput,
} from "~/features/plan/schemas/board-schedule-event-schema";

test("終了が開始以前ならエラーになる", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T09:00:00");
  const result = v.safeParse(PlanScheduleEventSchema, {
    end,
    priority: "medium",
    start,
    title: "X",
  });
  expect(result.success).toBe(false);
  expect(result.issues?.[0]?.message).toBe("終了は開始より後にしてください");
});

test("終了が開始より後なら通る", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T10:00:00");
  const result = v.safeParse(PlanScheduleEventSchema, {
    end,
    priority: "low",
    start,
    title: "X を見る",
  });
  expect(result.success).toBe(true);
});

test("空のタイトルはエラーになる", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T10:00:00");
  const result = v.safeParse(PlanScheduleEventSchema, {
    end,
    priority: "medium",
    start,
    title: "   ",
  });
  expect(result.success).toBe(false);
  expect(result.issues?.[0]?.message).toBe("タイトルは必須です");
});

test("項目ありならタイトル空でも通る", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T10:00:00");
  const result = v.safeParse(PlanScheduleEventSchema, {
    end,
    itemId: "item-1" as PlanScheduleEventOutput["itemId"],
    priority: "high",
    start,
    title: "",
  });
  expect(result.success).toBe(true);
});

test("項目は省略できる", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T10:00:00");
  const result = v.safeParse(PlanScheduleEventSchema, {
    end,
    priority: "high",
    start,
    title: "Part 7",
  });
  expect(result.success).toBe(true);
  expect((result.output as PlanScheduleEventOutput | undefined)?.itemId).toBeUndefined();
  expect((result.output as PlanScheduleEventOutput | undefined)?.eventId).toBeUndefined();
});
