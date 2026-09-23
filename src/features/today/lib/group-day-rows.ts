import { STATUSES, type Status } from "~domain/domain";
import { hasTimerState, measuredMs, timerMinutes } from "~domain/rowTimer";

import type { DayRow } from "~/features/today/types/day";
import { RECORD_STATUS_UI } from "~/lib/record-status-ui";

const [confirmedStatus, pendingStatus, inProgressStatus, skippedStatus] = STATUSES;

export const DAY_GROUP_SKIPPED_STATUS = RECORD_STATUS_UI[skippedStatus].label;
export const DAY_GROUP_CONFIRMED_STATUS = RECORD_STATUS_UI[confirmedStatus].label;
export const DAY_GROUP_INCOMPLETE_STATUS = "未完了" as const;

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

export const DAY_GROUP_STATUS_UI = {
  [DAY_GROUP_SKIPPED_STATUS]: {
    color: RECORD_STATUS_UI[skippedStatus].color,
    label: DAY_GROUP_SKIPPED_STATUS,
  },
  [DAY_GROUP_INCOMPLETE_STATUS]: {
    color: RECORD_STATUS_UI[pendingStatus].color,
    label: DAY_GROUP_INCOMPLETE_STATUS,
  },
  [DAY_GROUP_CONFIRMED_STATUS]: {
    color: RECORD_STATUS_UI[confirmedStatus].color,
    label: DAY_GROUP_CONFIRMED_STATUS,
  },
} as const;

export type DayGroupStatus = keyof typeof DAY_GROUP_STATUS_UI;

export function dayGroupCounts(rows: readonly { status: Status }[]): DayGroupCounts {
  let completeCount = 0;
  let incompleteCount = 0;
  for (const row of rows) {
    if (row.status === confirmedStatus) {
      completeCount += 1;
      continue;
    }
    if (row.status === pendingStatus || row.status === inProgressStatus) {
      incompleteCount += 1;
    }
  }
  return { completeCount, incompleteCount, totalCount: rows.length };
}

export function dayGroupStatus(rows: readonly { status: Status }[]): DayGroupStatus {
  let hasSkip = false;
  let hasIncomplete = false;
  for (const row of rows) {
    if (row.status === skippedStatus) {
      hasSkip = true;
      continue;
    }
    if (row.status !== confirmedStatus) {
      hasIncomplete = true;
    }
  }
  if (hasSkip) {
    return DAY_GROUP_SKIPPED_STATUS;
  }
  if (hasIncomplete) {
    return DAY_GROUP_INCOMPLETE_STATUS;
  }
  return DAY_GROUP_CONFIRMED_STATUS;
}

export function duplicateRecordBadgeLabel(counts: DayGroupCounts): string {
  return `${String(counts.totalCount)}件 · ${DAY_GROUP_INCOMPLETE_STATUS}${String(counts.incompleteCount)} · ${DAY_GROUP_CONFIRMED_STATUS}${String(counts.completeCount)}`;
}

export function joinedRowContent(rows: readonly { content: string }[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const row of rows) {
    if (row.content === "" || seen.has(row.content)) {
      continue;
    }
    seen.add(row.content);
    parts.push(row.content);
  }
  return parts.join("、");
}

export function splitGroupMinutes(totalMinutes: number, rowCount: number): number {
  if (rowCount <= 0) {
    return 0;
  }
  return Math.floor(totalMinutes / rowCount);
}

function rowDisplayMinutes(row: Pick<DayRow, "minutes" | "timer">, nowMs: number): number {
  if (hasTimerState(row.timer)) {
    return timerMinutes(measuredMs(row.timer, nowMs));
  }
  return row.minutes;
}

export function groupDisplayMinutes(
  rows: readonly Pick<DayRow, "minutes" | "timer">[],
  nowMs: number,
): number {
  let total = 0;
  for (const row of rows) {
    total += rowDisplayMinutes(row, nowMs);
  }
  return total;
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
