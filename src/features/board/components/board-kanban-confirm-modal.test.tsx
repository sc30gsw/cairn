import { expect, test } from "vite-plus/test";

import { needsKanbanConfirmEditor } from "~/features/board/components/board-kanban-confirm-modal";
import type { BoardRow } from "~/features/board/types/board";

function row(overrides: Partial<BoardRow> = {}): BoardRow {
  return {
    _id: "r1" as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: "Distinction",
    minutes: 0,
    sortOrder: 0,
    status: "未着手",
    timer: null,
    ...overrides,
  };
}

test("needsKanbanConfirmEditor is true only when minutes is 0 and there is no measurement", () => {
  expect(needsKanbanConfirmEditor(row())).toBe(true);
  expect(needsKanbanConfirmEditor(row({ content: "done", minutes: 0 }))).toBe(true);
  expect(needsKanbanConfirmEditor(row({ content: "", minutes: 10 }))).toBe(false);
  expect(needsKanbanConfirmEditor(row({ content: "done", minutes: 10 }))).toBe(false);
});

test("needsKanbanConfirmEditor is false whenever the row has a measurement, even at minutes 0", () => {
  expect(
    needsKanbanConfirmEditor(
      row({ minutes: 0, timer: { accumulatedMs: 754_000, autoStoppedAt: null, startedAt: null } }),
    ),
  ).toBe(false);
  expect(
    needsKanbanConfirmEditor(
      row({ minutes: 0, timer: { accumulatedMs: 0, autoStoppedAt: null, startedAt: 1_000 } }),
    ),
  ).toBe(false);
});
