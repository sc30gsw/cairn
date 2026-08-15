export type RowStatus = "スキップ" | "未着手" | "確定";

export type ExistingRow = {
  content: string;
  itemName: string;
  minutes: number;
  status: RowStatus;
};

export type PresetLine = {
  content: string;
  itemName: string;
  minutes: number;
};

export function materializePresetRows(lines: readonly PresetLine[]): ExistingRow[] {
  return lines.map((line) => ({
    content: line.content,
    itemName: line.itemName,
    minutes: line.minutes,
    status: "未着手",
  }));
}

export function switchPresetRows(
  existing: readonly ExistingRow[],
  nextLines: readonly PresetLine[],
): ExistingRow[] {
  const kept = existing.filter((row) => row.status === "確定" || row.status === "スキップ");
  return [...kept, ...materializePresetRows(nextLines)];
}

export function weekdayAlreadyTaken(
  weekday: number,
  existingWeekdays: readonly number[],
  ignoreWeekday?: number,
): boolean {
  return existingWeekdays.some((value) => value === weekday && value !== ignoreWeekday);
}

export function itemIsInUse(itemName: string, rows: readonly { itemName: string }[]): boolean {
  return rows.some((row) => row.itemName === itemName);
}
