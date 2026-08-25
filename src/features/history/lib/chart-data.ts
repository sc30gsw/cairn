import type { DateJst } from "~domain/jst";

import { chartCategoryColor } from "~/features/history/lib/chart-category-colors";
import type {
  CategoryBreakdown,
  HeatmapDay,
  MonthBreakdown,
  WeekBreakdown,
} from "~/features/history/types/history";

type DonutCell = {
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

export type PaceChartPoint = {
  dateJst: DateJst;
  label: string;
  完了: number;
  均: number;
};

//? teal は theme.ts のカラータプルに無い(design-live-board.md ルール2)。7日平均は green で表す
export const PACE_CHART_SERIES = [
  { color: "blue.6", label: "完了", name: "完了", type: "bar" as const },
  { color: "green.6", label: "7日平均", name: "均", type: "area" as const },
] as const;

/** X軸ラベル（例: 08/17） */
export function paceChartDayLabel(dateJst: DateJst): string {
  return `${dateJst.slice(5, 7)}/${dateJst.slice(8)}`;
}

function weekOfMonthIndex(dateJst: DateJst): number {
  return Math.ceil(Number(dateJst.slice(8)) / 7);
}

/** 週チャートの見出し（例: 8月第3週） */
export function paceChartWeekTitle(weekStart: DateJst, weekEnd: DateJst): string {
  const startMonth = Number(weekStart.slice(5, 7));
  const endMonth = Number(weekEnd.slice(5, 7));
  if (startMonth === endMonth) {
    return `${startMonth}月第${weekOfMonthIndex(weekStart)}週`;
  }
  return `${paceChartDayLabel(weekStart)}〜${paceChartDayLabel(weekEnd)}`;
}

/** 月チャートの見出し（例: 8月） */
export function paceChartMonthTitle(yearMonth: string): string {
  const month = Number(yearMonth.split("-")[1]);
  return `${month}月`;
}

export function buildMonthPaceChartData(
  days: readonly Pick<MonthBreakdown["days"][number], "dateJst" | "minutes" | "movingAverage">[],
): PaceChartPoint[] {
  return days.map((day) => ({
    dateJst: day.dateJst,
    label: paceChartDayLabel(day.dateJst),
    完了: day.minutes,
    均: day.movingAverage,
  }));
}

export function buildWeekPaceChartData(
  byDay: readonly Pick<WeekBreakdown["byDay"][number], "confirmedMinutes" | "dateJst">[],
  heatmapDays: readonly Pick<HeatmapDay, "dateJst" | "movingAverage">[],
): PaceChartPoint[] {
  const avgByDate = new Map(heatmapDays.map((day) => [day.dateJst, day.movingAverage]));
  return byDay.map((day) => ({
    dateJst: day.dateJst,
    label: paceChartDayLabel(day.dateJst),
    完了: day.confirmedMinutes,
    均: avgByDate.get(day.dateJst) ?? 0,
  }));
}
