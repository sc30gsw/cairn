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
  const indexByItem = new Map<DayRow["itemId"], number>();

  for (const row of rows) {
    const existing = indexByItem.get(row.itemId);
    if (existing === undefined) {
      indexByItem.set(row.itemId, groups.length);
      groups.push({
        itemId: row.itemId,
        itemName: row.itemName,
        rows: [row],
        statuses: [row.status],
        totalMinutes: row.minutes,
      });
      continue;
    }
    const group = groups[existing];
    if (group === undefined) {
      continue;
    }
    group.rows.push(row);
    group.totalMinutes += row.minutes;
    if (!group.statuses.includes(row.status)) {
      group.statuses.push(row.status);
    }
  }

  return groups;
}
