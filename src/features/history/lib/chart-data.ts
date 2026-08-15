import { chartCategoryColor } from "~/features/history/lib/chart-category-colors";
import type { CategoryBreakdown } from "~/features/history/types/history";

export type DonutCell = {
  color: string;
  name: string;
  value: number;
};

export function buildDonutCells(
  byCategory: readonly Pick<CategoryBreakdown, "category" | "minutes">[],
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
  完了: number;
};

export function buildWeekBarData(
  byDay: readonly { confirmedMinutes: number; dateJst: string }[],
): WeekBarPoint[] {
  return byDay.map((day) => ({
    dateJst: day.dateJst,
    label: day.dateJst.slice(8),
    完了: day.confirmedMinutes,
  }));
}
