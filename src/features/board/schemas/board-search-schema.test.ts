import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { BoardSearchSchema } from "~/features/board/schemas/board-search-schema";

test("BoardSearchSchema は kanban と schedule を受け入れる", () => {
  expect(v.safeParse(BoardSearchSchema, {}).success).toBe(true);
  expect(v.safeParse(BoardSearchSchema, { tab: "kanban" }).success).toBe(true);
  expect(v.safeParse(BoardSearchSchema, { tab: "schedule" }).success).toBe(true);
});

test("BoardSearchSchema は不正な tab を拒否する", () => {
  expect(v.safeParse(BoardSearchSchema, { tab: "month" }).success).toBe(false);
});
