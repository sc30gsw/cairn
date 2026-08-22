import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { KANBAN_COLUMNS } from "~/features/board/lib/kanban-order";

test("KANBAN_COLUMNS は STATUSES の部分集合である", () => {
  for (const column of KANBAN_COLUMNS) {
    expect(STATUSES.includes(column)).toBe(true);
  }
});

test("KANBAN_COLUMNS は進行中を含む", () => {
  expect(KANBAN_COLUMNS).toContain("進行中");
});
