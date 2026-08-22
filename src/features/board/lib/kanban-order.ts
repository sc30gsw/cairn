import { STATUSES } from "~domain/domain";

import type { Id } from "~/../convex/_generated/dataModel";
import type { BoardRow } from "~/features/board/types/board";

export const KANBAN_COLUMNS = [
  "未着手",
  "確定",
  "スキップ",
] as const satisfies readonly (typeof STATUSES)[number][];

export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export function groupRowsByKanbanColumn(
  rows: readonly BoardRow[],
): Record<KanbanColumn, BoardRow[]> {
  return {
    スキップ: rows.filter((row) => row.status === "スキップ"),
    未着手: rows.filter((row) => row.status === "未着手"),
    確定: rows.filter((row) => row.status === "確定"),
  };
}

export function computeOrderedRowIds(
  rows: readonly BoardRow[],
  source: { index: number; status: KanbanColumn },
  destination: { index: number; status: KanbanColumn },
  movedRowId: Id<"rows">,
): Id<"rows">[] {
  const grouped = groupRowsByKanbanColumn(rows);
  const sourceItems = [...grouped[source.status]];
  const movedIndex = sourceItems.findIndex((row) => row._id === movedRowId);
  if (movedIndex === -1) {
    return rows.map((row) => row._id);
  }
  const [moved] = sourceItems.splice(movedIndex, 1);
  if (moved === undefined) {
    return rows.map((row) => row._id);
  }

  const destinationItems =
    source.status === destination.status
      ? sourceItems
      : [...grouped[destination.status]].filter((row) => row._id !== movedRowId);
  destinationItems.splice(destination.index, 0, moved);

  if (source.status === destination.status) {
    grouped[source.status] = destinationItems;
  } else {
    grouped[source.status] = sourceItems;
    grouped[destination.status] = destinationItems;
  }

  return KANBAN_COLUMNS.flatMap((status) => grouped[status].map((row) => row._id));
}

export function resolveKanbanStatusMove(
  sourceStatus: BoardRow["status"],
  destinationStatus: KanbanColumn,
): "confirm" | "noop" | "skip" | "unskip" {
  if (sourceStatus === destinationStatus) {
    return "noop";
  }
  if (destinationStatus === "確定") {
    return "confirm";
  }
  if (destinationStatus === "スキップ") {
    return "skip";
  }
  if (destinationStatus === "未着手" && sourceStatus === "スキップ") {
    return "unskip";
  }
  return "noop";
}

export function hasRowOrderChanged(
  rows: readonly BoardRow[],
  orderedRowIds: readonly Id<"rows">[],
): boolean {
  if (rows.length !== orderedRowIds.length) {
    return true;
  }
  return orderedRowIds.some((rowId, index) => rows[index]?._id !== rowId);
}
