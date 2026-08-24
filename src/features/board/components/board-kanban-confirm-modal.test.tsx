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

test("needsKanbanConfirmEditor is true when content or minutes are empty", () => {
  expect(needsKanbanConfirmEditor(row())).toBe(true);
  expect(needsKanbanConfirmEditor(row({ content: "done", minutes: 0 }))).toBe(true);
  expect(needsKanbanConfirmEditor(row({ content: "", minutes: 10 }))).toBe(true);
  expect(needsKanbanConfirmEditor(row({ content: "done", minutes: 10 }))).toBe(false);
});
