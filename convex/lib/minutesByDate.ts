import { groupBy, mapValues, prop } from "remeda";

import type { VolumeRow } from "./volume";
import { confirmedVolumeMinutes } from "./volume";

export type MinutesByDate = Readonly<Record<string, number>>;

//* 確定行だけを暦日ごとに合計する。実施日の判定はここで集めた分数に対して行う(CONTEXT.md 実施日)。
//? サーバの weeklyTrend とクライアントの週間進捗が同じ集計を使う(CVX-09: 純関数 / CVX-16: SSoT)。
export function minutesByDateFromRows(
  rows: readonly (Record<"dateJst", string> & VolumeRow)[],
): MinutesByDate {
  return mapValues(groupBy(rows, prop("dateJst")), confirmedVolumeMinutes);
}
