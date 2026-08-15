import { chartCategoryColor } from "~/features/history/lib/chart-category-colors";

type CategorySlice = {
  category: string;
  minutes: number;
};

export type DonutCell = {
  color: string;
  name: string;
  value: number;
};

export function buildDonutCells(
  byCategory: readonly CategorySlice[],
  skippedMinutes: number,
): DonutCell[] {
  const cells = byCategory.map((entry) => ({
    color: chartCategoryColor(entry.category),
    name: entry.category,
    value: entry.minutes,
  }));
  if (skippedMinutes > 0) {
    cells.push({
      color: chartCategoryColor("見送り"),
      name: "見送り",
      value: skippedMinutes,
    });
  }
  return cells;
}

export type WeekBarPoint = {
  dateJst: string;
  label: string;
  確定: number;
};

export function buildWeekBarData(
  byDay: readonly { confirmedMinutes: number; dateJst: string }[],
): WeekBarPoint[] {
  return byDay.map((day) => ({
    dateJst: day.dateJst,
    label: day.dateJst.slice(8),
    確定: day.confirmedMinutes,
  }));
}
