export type RowStatus = "スキップ" | "未着手" | "確定";

export type ExistingRow = {
  status: RowStatus;
};

export type PresetLine = {
  content: string;
  itemId: string;
  minutes: number;
};

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
  return existing.filter((row) => row.status === "確定" || row.status === "スキップ");
}

export function weekdayAlreadyTaken(
  weekday: number,
  existingWeekdays: readonly number[],
  ignoreWeekday?: number,
): boolean {
  return existingWeekdays.some((value) => value === weekday && value !== ignoreWeekday);
}

export function itemIdIsInUse(itemId: string, holders: readonly { itemId: string }[]): boolean {
  return holders.some((holder) => holder.itemId === itemId);
}
