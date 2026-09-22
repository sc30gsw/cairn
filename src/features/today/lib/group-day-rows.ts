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
};

export function dayGroupCounts(rows: readonly { status: Status }[]): DayGroupCounts {
  let completeCount = 0;
  for (const row of rows) {
    if (row.status === "確定") {
      completeCount += 1;
    }
  }
  return { completeCount, incompleteCount: rows.length - completeCount };
}

export function duplicatePlanBadgeLabel(counts: DayGroupCounts): string {
  return `未完了予定が${String(counts.incompleteCount)}件、完了${String(counts.completeCount)}件`;
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
