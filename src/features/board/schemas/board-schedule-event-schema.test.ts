import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import {
  BoardScheduleEventSchema,
  type BoardScheduleEventOutput,
} from "~/features/board/schemas/board-schedule-event-schema";

test("終了が開始以前ならエラーになる", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T09:00:00");
  const result = v.safeParse(BoardScheduleEventSchema, {
    color: "blue",
    end,
    rowId: "row-1",
    start,
  });
  expect(result.success).toBe(false);
  expect(result.issues?.[0]?.message).toBe("終了は開始より後にしてください");
});

test("終了が開始より後なら通る", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T10:00:00");
  const result = v.safeParse(BoardScheduleEventSchema, {
    color: "blue",
    end,
    rowId: "row-1",
    start,
  });
  expect(result.success).toBe(true);
});

test("rowId が空文字だとエラーになる", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T10:00:00");
  const result = v.safeParse(BoardScheduleEventSchema, {
    color: "blue",
    end,
    rowId: "",
    start,
  });
  expect(result.success).toBe(false);
  expect(result.issues?.[0]?.message).toBe("項目を選んでください");
});

test("blockId は省略できる", () => {
  const start = new Date("2026-08-17T09:00:00");
  const end = new Date("2026-08-17T10:00:00");
  const result = v.safeParse(BoardScheduleEventSchema, {
    color: "blue",
    end,
    rowId: "row-1",
    start,
  });
  expect(result.success).toBe(true);
  expect((result.output as BoardScheduleEventOutput | undefined)?.blockId).toBeUndefined();
});
