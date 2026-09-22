import type { Status } from "~domain/domain";

import type { DayRow } from "~/features/today/types/day";

export type DayRowGroup = {
  itemId: DayRow["itemId"];
  itemName: string;
  rows: DayRow[];
  statuses: Status[];
  totalMinutes: number;
};

export type DayGroupCounts = {
  completeCount: number;
  incompleteCount: number;
  totalCount: number;
};

export type DayGroupStatus = "見送り" | "未完了" | "完了";

export const DAY_GROUP_STATUS_UI = {
  見送り: { color: "yellow", label: "見送り" },
  未完了: { color: "gray", label: "未完了" },
  完了: { color: "green", label: "完了" },
} as const satisfies Record<DayGroupStatus, { color: string; label: string }>;

export function dayGroupCounts(rows: readonly { status: Status }[]): DayGroupCounts {
  let completeCount = 0;
  let incompleteCount = 0;
  for (const row of rows) {
    if (row.status === "確定") {
      completeCount += 1;
      continue;
    }
    if (row.status === "未着手" || row.status === "進行中") {
      incompleteCount += 1;
    }
  }
  return { completeCount, incompleteCount, totalCount: rows.length };
}

export function dayGroupStatus(rows: readonly { status: Status }[]): DayGroupStatus {
  let hasSkip = false;
  let hasIncomplete = false;
  for (const row of rows) {
    if (row.status === "スキップ") {
      hasSkip = true;
      continue;
    }
    if (row.status !== "確定") {
      hasIncomplete = true;
    }
  }
  if (hasSkip) {
    return "見送り";
  }
  if (hasIncomplete) {
    return "未完了";
  }
  return "完了";
}

export function duplicateRecordBadgeLabel(counts: DayGroupCounts): string {
  return `${String(counts.totalCount)}件 · 未完了${String(counts.incompleteCount)} · 完了${String(counts.completeCount)}`;
}

export function sharedRowContent(rows: readonly { content: string }[]): string | null {
  const first = rows[0];
  if (first === undefined) {
    return null;
  }
  for (const row of rows) {
    if (row.content !== first.content) {
      return null;
    }
  }
  return first.content;
}

export function groupDayRowsByItem(rows: readonly DayRow[]): DayRowGroup[] {
  const groups: DayRowGroup[] = [];
  const groupByItem = new Map<DayRow["itemId"], DayRowGroup>();

  for (const row of rows) {
    const existing = groupByItem.get(row.itemId);
    if (existing === undefined) {
      const group: DayRowGroup = {
        itemId: row.itemId,
        itemName: row.itemName,
        rows: [row],
        statuses: [row.status],
        totalMinutes: row.minutes,
      };
      groupByItem.set(row.itemId, group);
      groups.push(group);
      continue;
    }
    existing.rows.push(row);
    existing.totalMinutes += row.minutes;
    if (!existing.statuses.includes(row.status)) {
      existing.statuses.push(row.status);
    }
  }

  return groups;
}
