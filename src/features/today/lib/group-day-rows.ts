import type { Status } from "~domain/domain";

import type { DayRow } from "~/features/today/types/day";

export type DayRowGroup = {
  itemId: DayRow["itemId"];
  itemName: string;
  rows: DayRow[];
  statuses: Status[];
  totalMinutes: number;
};

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
