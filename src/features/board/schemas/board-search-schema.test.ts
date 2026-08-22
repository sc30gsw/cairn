import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { BoardSearchSchema } from "~/features/board/schemas/board-search-schema";

test("BoardSearchSchema は kanban と schedule を受け入れる", () => {
  expect(v.safeParse(BoardSearchSchema, {}).success).toBe(true);
  expect(v.safeParse(BoardSearchSchema, { tab: "kanban" }).success).toBe(true);
  expect(v.safeParse(BoardSearchSchema, { tab: "schedule" }).success).toBe(true);
});

test("BoardSearchSchema は schedule view と日付パラメータを受け入れる", () => {
  expect(
    v.safeParse(BoardSearchSchema, {
      tab: "schedule",
      view: "week",
      week: "2026-08-11",
    }).success,
  ).toBe(true);
  expect(
    v.safeParse(BoardSearchSchema, {
      date: "2026-08-17",
      month: "2026-08",
      view: "day",
    }).success,
  ).toBe(true);
});

test("BoardSearchSchema は不正な tab を拒否する", () => {
  expect(v.safeParse(BoardSearchSchema, { tab: "month" }).success).toBe(false);
});

test("BoardSearchSchema は存在しない暦日を拒否する", () => {
  expect(v.safeParse(BoardSearchSchema, { date: "2026-02-30" }).success).toBe(false);
  expect(v.safeParse(BoardSearchSchema, { week: "2026-13-01" }).success).toBe(false);
});

test("BoardSearchSchema は不正な month 形式を拒否する", () => {
  expect(v.safeParse(BoardSearchSchema, { month: "2026-8" }).success).toBe(false);
});
