import { expect, test } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  computeOrderedRowIds,
  groupRowsByKanbanColumn,
  hasRowOrderChanged,
  resolveKanbanStatusMove,
} from "~/features/board/lib/kanban-order";
import type { BoardRow } from "~/features/board/types/board";

function row(id: string, status: BoardRow["status"], sortOrder: number): BoardRow {
  return {
    _id: id as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: id,
    minutes: 0,
    sortOrder,
    status,
  };
}

test("groupRowsByKanbanColumn は列ごとに記録を分ける", () => {
  const grouped = groupRowsByKanbanColumn([
    row("a", "未着手", 0),
    row("b", "進行中", 1),
    row("c", "確定", 2),
    row("d", "スキップ", 3),
  ]);

  expect(grouped.未着手.map((entry) => entry._id)).toEqual(["a" as Id<"rows">]);
  expect(grouped.進行中.map((entry) => entry._id)).toEqual(["b" as Id<"rows">]);
  expect(grouped.確定.map((entry) => entry._id)).toEqual(["c" as Id<"rows">]);
  expect(grouped.スキップ.map((entry) => entry._id)).toEqual(["d" as Id<"rows">]);
});

test("computeOrderedRowIds は列内の並べ替えを反映する", () => {
  const rows = [row("a", "未着手", 0), row("b", "未着手", 1), row("c", "確定", 2)];
  const ordered = computeOrderedRowIds(
    rows,
    { index: 0, status: "未着手" },
    { index: 1, status: "未着手" },
    "a" as Id<"rows">,
  );

  expect(ordered).toEqual(["b", "a", "c"].map((id) => id as Id<"rows">));
});

test("computeOrderedRowIds は列間移動後も全体順序を保つ", () => {
  const rows = [row("a", "未着手", 0), row("b", "未着手", 1), row("c", "確定", 2)];
  const ordered = computeOrderedRowIds(
    rows,
    { index: 0, status: "未着手" },
    { index: 0, status: "進行中" },
    "a" as Id<"rows">,
  );

  expect(ordered).toEqual(["b", "a", "c"].map((id) => id as Id<"rows">));
});

test("resolveKanbanStatusMove は列間の状態遷移を解決する", () => {
  expect(resolveKanbanStatusMove("未着手", "確定")).toBe("confirm");
  expect(resolveKanbanStatusMove("未着手", "進行中")).toBe("start");
  expect(resolveKanbanStatusMove("進行中", "未着手")).toBe("pause");
  expect(resolveKanbanStatusMove("進行中", "確定")).toBe("confirm");
  expect(resolveKanbanStatusMove("確定", "進行中")).toBe("reopen");
  expect(resolveKanbanStatusMove("スキップ", "未着手")).toBe("unskip");
  expect(resolveKanbanStatusMove("確定", "未着手")).toBe("unconfirm");
  expect(resolveKanbanStatusMove("確定", "スキップ")).toBe("skip");
  expect(resolveKanbanStatusMove("スキップ", "進行中")).toBe("noop");
});

test("hasRowOrderChanged は順序差分を検出する", () => {
  const rows = [row("a", "未着手", 0), row("b", "確定", 1)];
  expect(
    hasRowOrderChanged(
      rows,
      ["a", "b"].map((id) => id as Id<"rows">),
    ),
  ).toBe(false);
  expect(
    hasRowOrderChanged(
      rows,
      ["b", "a"].map((id) => id as Id<"rows">),
    ),
  ).toBe(true);
});
