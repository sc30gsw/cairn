import type { Id } from "../../_generated/dataModel";
import { todayJst } from "../../lib/jst";
import type { MasteryProgress } from "../../lib/validators";
import type { VolumeRow } from "../../lib/volume";

type DatedRow = Record<"dateJst", string> & Record<"itemId", Id<"items">> & VolumeRow;

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

export function creationDateJst(creationTime: number): string {
  return todayJst(new Date(creationTime));
}
