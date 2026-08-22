import type { Doc } from "../_generated/dataModel";
import type { PresetLine, RowStatus } from "./validators";

export type { PresetLine, RowStatus };

export type ExistingRow = Pick<Doc<"rows">, "status">;

export function materializePresetRows(lines: readonly PresetLine[]): (PresetLine & {
  status: "未着手";
})[] {
  return lines.map((line) => ({
    content: line.content,
    itemId: line.itemId,
    minutes: line.minutes,
    status: "未着手",
  }));
}

export function keptRowsAfterSwitch<T extends ExistingRow>(existing: readonly T[]): T[] {
  return existing.filter(
    (row) => row.status === "確定" || row.status === "スキップ" || row.status === "進行中",
  );
}

export function weekdayAlreadyTaken(
  weekday: number,
  existingWeekdays: readonly number[],
  ignoreWeekday?: number,
): boolean {
  return existingWeekdays.some((value) => value === weekday && value !== ignoreWeekday);
}

export function itemIdIsInUse(
  itemId: PresetLine["itemId"],
  holders: readonly { itemId: PresetLine["itemId"] }[],
): boolean {
  return holders.some((holder) => holder.itemId === itemId);
}
