import type { Id } from "../../_generated/dataModel";
import { todayJst } from "../../lib/jst";
import type { MasteryProgress } from "../../lib/validators";
import type { VolumeRow } from "../../lib/volume";

type DatedRow = Record<"dateJst", string> & Record<"itemId", Id<"items">> & VolumeRow;

//* 習得目標に併記する学習量の実績。目標を作った日以降・対象項目内の確定分数と実施日数(CONTEXT.md「習得」)。
//? 自己判定の較正が目的なので達成判定には使わない。実施日は「確定記録が1件でもある暦日」で、
//? 週間ターゲットの days と同じ数え方をする(最低分数のフロアは持たない)。CVX-09: 純関数。
//? scopeItemIds が undefined なら全項目を数える(= 従来の意味そのまま。#53)。
export function masteryProgressSince(
  rows: readonly DatedRow[],
  sinceDateJst: string,
  scopeItemIds: readonly Id<"items">[] | undefined,
): MasteryProgress {
  const scope = scopeItemIds === undefined ? undefined : new Set(scopeItemIds);
  const dates = new Set<string>();
  let confirmedMinutes = 0;
  for (const row of rows) {
    if (row.status !== "確定" || row.dateJst < sinceDateJst) {
      continue;
    }
    if (scope !== undefined && !scope.has(row.itemId)) {
      continue;
    }
    confirmedMinutes += row.minutes;
    dates.add(row.dateJst);
  }
  return { activeDays: dates.size, confirmedMinutes };
}

//* Convex の _creationTime(ms) を JST 暦日に写す。
//? 保存済みの値を変換するだけで現在時刻は読まないので、query から呼んでよい(CVX-14)。
export function creationDateJst(creationTime: number): string {
  return todayJst(new Date(creationTime));
}
