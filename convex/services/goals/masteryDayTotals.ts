import type { Doc, Id } from "../../_generated/dataModel";
import type { MasteryProgress } from "../../lib/validators";

//* 1暦日の確定実績。実施日は「確定記録が1件でもある暦日」なので分数だけでは足りず、件数も数える。
//? 0分の確定記録があると合計は0のままでも実施日は1日 — masteryProgressSince と同じ数え方に揃える。
//? 分数の形は保存カウンタから導出する(CVX-16: validators の MasteryProgress が SSoT)。
export type ConfirmedDayTotals = Pick<MasteryProgress, "confirmedMinutes"> &
  Record<"confirmedCount", number>;

export const EMPTY_DAY_TOTALS = {
  confirmedCount: 0,
  confirmedMinutes: 0,
} as const satisfies ConfirmedDayTotals;

//* 1暦日の「項目別」確定実績。対象項目の部分和を取れる最小の形(CVX-09: 純関数)。
export type ItemConfirmedTotals = ReadonlyMap<Id<"items">, ConfirmedDayTotals>;

type DayRow = Pick<Doc<"rows">, "deletedAt" | "itemId" | "minutes" | "status">;

//* その暦日の rows から確定実績を項目別に数える(CVX-09: 純関数)。
//? 日がゴミ箱にあると暦日ごと実績から外れる。history/shared.ts の liveRows と同じ規則。
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

//* 早期リターンの十分条件。項目別合計が完全一致なら、どの対象項目の部分和も一致する(CVX-09: 純関数)。
//? 日合計での判定では足りない — 同じ日に別項目の確定が入れ替わると合計は同じでも部分和は動く(#53 §6.3)。
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

//* 対象項目で絞った日合計。scopeItemIds が undefined ならすべての項目を足す(CVX-09: 純関数)。
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

//* 実施日数の増減。1暦日は「確定が1件でもあるか」の 0↔正 遷移でだけ ±1 する(CVX-09: 純関数)。
export function activeDayDelta(beforeCount: number, afterCount: number): number {
  if (beforeCount <= 0 && afterCount > 0) {
    return 1;
  }
  if (beforeCount > 0 && afterCount <= 0) {
    return -1;
  }
  return 0;
}

//* 書き込みの前後で実測した日合計から、カウンタに足す差分を出す(CVX-09: 純関数)。
//? 「想定した増減」ではなく「実測の後 − 前」なので、書き込みの効果を読み違えても漂流しない。
export function masteryProgressDelta(
  before: ConfirmedDayTotals,
  after: ConfirmedDayTotals,
): MasteryProgress {
  return {
    activeDays: activeDayDelta(before.confirmedCount, after.confirmedCount),
    confirmedMinutes: after.confirmedMinutes - before.confirmedMinutes,
  };
}

//* 保存カウンタに差分を足した次の値(CVX-09: 純関数)。2フィールドを呼び出し側で組み立てない。
export function shiftMasteryProgress(
  progress: MasteryProgress,
  delta: MasteryProgress,
): MasteryProgress {
  return {
    activeDays: progress.activeDays + delta.activeDays,
    confirmedMinutes: progress.confirmedMinutes + delta.confirmedMinutes,
  };
}

//* 習得目標を作った日の実績を初期値にする。作成日と同じ暦日の確定は実績に入る(現仕様)。
export function initialMasteryProgress(totals: ConfirmedDayTotals): MasteryProgress {
  return {
    activeDays: totals.confirmedCount > 0 ? 1 : 0,
    confirmedMinutes: totals.confirmedMinutes,
  };
}
