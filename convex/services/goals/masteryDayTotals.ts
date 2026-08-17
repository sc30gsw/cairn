import type { Doc } from "../../_generated/dataModel";
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

type DayRow = Pick<Doc<"rows">, "deletedAt" | "minutes" | "status">;

//* その暦日の rows から確定実績を数える(CVX-09: 純関数)。
//? 日がゴミ箱にあると暦日ごと実績から外れる。history/shared.ts の liveRows と同じ規則。
export function confirmedDayTotals(
  rows: readonly DayRow[],
  hasLiveDay: boolean,
): ConfirmedDayTotals {
  if (!hasLiveDay) {
    return EMPTY_DAY_TOTALS;
  }
  let confirmedCount = 0;
  let confirmedMinutes = 0;
  for (const row of rows) {
    if (row.deletedAt !== undefined || row.status !== "確定") {
      continue;
    }
    confirmedCount += 1;
    confirmedMinutes += row.minutes;
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
