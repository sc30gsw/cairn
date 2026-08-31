import type { Doc, Id } from "../../_generated/dataModel";
import type { MasteryProgress } from "../../lib/validators";

export type ConfirmedDayTotals = Pick<MasteryProgress, "confirmedMinutes"> &
  Record<"confirmedCount", number>;

export const EMPTY_DAY_TOTALS = {
  confirmedCount: 0,
  confirmedMinutes: 0,
} as const satisfies ConfirmedDayTotals;

export type ItemConfirmedTotals = ReadonlyMap<Id<"items">, ConfirmedDayTotals>;

type DayRow = Pick<Doc<"rows">, "deletedAt" | "itemId" | "minutes" | "status">;

export function confirmedTotalsByItem(
  rows: readonly DayRow[],
  hasLiveDay: boolean,
): ItemConfirmedTotals {
  const totals = new Map<Id<"items">, ConfirmedDayTotals>();
  if (!hasLiveDay) {
    return totals;
  }
  for (const row of rows) {
    if (row.deletedAt !== undefined || row.status !== "確定") {
      continue;
    }
    const current = totals.get(row.itemId) ?? EMPTY_DAY_TOTALS;
    totals.set(row.itemId, {
      confirmedCount: current.confirmedCount + 1,
      confirmedMinutes: current.confirmedMinutes + row.minutes,
    });
  }
  return totals;
}

export function sameItemTotals(before: ItemConfirmedTotals, after: ItemConfirmedTotals): boolean {
  if (before.size !== after.size) {
    return false;
  }
  for (const [itemId, totals] of before) {
    const other = after.get(itemId);
    if (
      other === undefined ||
      other.confirmedCount !== totals.confirmedCount ||
      other.confirmedMinutes !== totals.confirmedMinutes
    ) {
      return false;
    }
  }
  return true;
}

export function scopedDayTotals(
  totals: ItemConfirmedTotals,
  scopeItemIds: readonly Id<"items">[] | undefined,
): ConfirmedDayTotals {
  let confirmedCount = 0;
  let confirmedMinutes = 0;
  if (scopeItemIds === undefined) {
    for (const entry of totals.values()) {
      confirmedCount += entry.confirmedCount;
      confirmedMinutes += entry.confirmedMinutes;
    }
    return { confirmedCount, confirmedMinutes };
  }
  for (const itemId of scopeItemIds) {
    const entry = totals.get(itemId);
    if (entry === undefined) {
      continue;
    }
    confirmedCount += entry.confirmedCount;
    confirmedMinutes += entry.confirmedMinutes;
  }
  return { confirmedCount, confirmedMinutes };
}

export function activeDayDelta(beforeCount: number, afterCount: number): number {
  if (beforeCount <= 0 && afterCount > 0) {
    return 1;
  }
  if (beforeCount > 0 && afterCount <= 0) {
    return -1;
  }
  return 0;
}

export function masteryProgressDelta(
  before: ConfirmedDayTotals,
  after: ConfirmedDayTotals,
): MasteryProgress {
  return {
    activeDays: activeDayDelta(before.confirmedCount, after.confirmedCount),
    confirmedMinutes: after.confirmedMinutes - before.confirmedMinutes,
  };
}

export function shiftMasteryProgress(
  progress: MasteryProgress,
  delta: MasteryProgress,
): MasteryProgress {
  return {
    activeDays: progress.activeDays + delta.activeDays,
    confirmedMinutes: progress.confirmedMinutes + delta.confirmedMinutes,
  };
}

export function initialMasteryProgress(totals: ConfirmedDayTotals): MasteryProgress {
  return {
    activeDays: totals.confirmedCount > 0 ? 1 : 0,
    confirmedMinutes: totals.confirmedMinutes,
  };
}
