import type {
  ChartReferenceAreaProps,
  ChartReferenceDotProps,
  CompositeChartSeries,
} from "@mantine/charts";
import { weekdayFromDateJst, type DateJst } from "~domain/jst";
import { WEEKDAY_DISPLAY_ORDER } from "~domain/presetDigest";

import { chartCategoryColor } from "~/features/history/lib/chart-category-colors";
import type {
  CategoryBreakdown,
  HeatmapDay,
  MonthBreakdown,
  WeekBreakdown,
} from "~/features/history/types/history";

type HistoryEventForMatrix = Pick<
  MonthBreakdown["events"][number],
  "category" | "dateJst" | "minutes" | "status"
>;

type MatrixDay = Pick<HeatmapDay, "dateJst" | "kind">;

export type WeekdayCategoryMatrixCell = {
  days: number;
  totalMinutes: number;
  value: number | null;
  x: string;
  y: string;
};

export const WEEKDAY_CATEGORY_MATRIX_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

const WEEKDAY_LABEL_BY_VALUE = new Map(
  WEEKDAY_DISPLAY_ORDER.map((weekday, index) => [weekday, WEEKDAY_CATEGORY_MATRIX_LABELS[index]]),
);

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

export const PACE_CHART_SERIES = [
  { color: "blue.6", label: "完了", name: "完了", type: "bar" },
  { color: "green.6", label: "7日平均", name: "均", type: "area" },
] as const satisfies readonly CompositeChartSeries[];

export function paceChartDayLabel(dateJst: DateJst): string {
  return `${dateJst.slice(5, 7)}/${dateJst.slice(8)}`;
}

function weekOfMonthIndex(dateJst: DateJst): number {
  return Math.ceil(Number(dateJst.slice(8)) / 7);
}

export function paceChartWeekTitle(weekStart: DateJst, weekEnd: DateJst): string {
  const startMonth = Number(weekStart.slice(5, 7));
  const endMonth = Number(weekEnd.slice(5, 7));
  if (startMonth === endMonth) {
    return `${startMonth}月第${weekOfMonthIndex(weekStart)}週`;
  }
  return `${paceChartDayLabel(weekStart)}〜${paceChartDayLabel(weekEnd)}`;
}

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

export function buildPaceWeekendReferenceAreas(
  data: readonly Pick<PaceChartPoint, "dateJst" | "label">[],
): ChartReferenceAreaProps[] {
  return data.flatMap((point, index) => {
    if (weekdayFromDateJst(point.dateJst) !== 6) {
      return [];
    }
    const sunday = data[index + 1];
    if (sunday === undefined || weekdayFromDateJst(sunday.dateJst) !== 0) {
      return [];
    }
    return [
      {
        color: "orange.2",
        x1: point.label,
        x2: sunday.label,
      },
    ];
  });
}

export function buildPaceSelectedDateReferenceDots(
  data: readonly PaceChartPoint[],
  selectedDateJst: DateJst,
): ChartReferenceDotProps[] {
  const point = data.find((entry) => entry.dateJst === selectedDateJst);
  if (point === undefined) {
    return [];
  }
  return [{ color: "orange.7", label: "選択日", x: point.label, y: point.完了 }];
}

export function buildWeekdayCategoryMatrix(
  events: readonly HistoryEventForMatrix[],
  days: readonly MatrixDay[],
  todayJst: DateJst,
  categories: readonly string[],
): WeekdayCategoryMatrixCell[] {
  const eligibleDays = days.filter(
    (day) =>
      day.dateJst < todayJst && day.kind !== "beforeRegistration" && day.kind !== "unrecorded",
  );
  const eligibleDateSet = new Set(eligibleDays.map((day) => day.dateJst));
  const denominatorByWeekday = new Map<number, number>();
  for (const day of eligibleDays) {
    const weekday = weekdayFromDateJst(day.dateJst);
    denominatorByWeekday.set(weekday, (denominatorByWeekday.get(weekday) ?? 0) + 1);
  }

  const minutesByWeekdayAndCategory = new Map<string, number>();
  for (const event of events) {
    if (event.status !== "確定" || !eligibleDateSet.has(event.dateJst)) {
      continue;
    }
    const key = `${weekdayFromDateJst(event.dateJst)}:${event.category}`;
    minutesByWeekdayAndCategory.set(
      key,
      (minutesByWeekdayAndCategory.get(key) ?? 0) + event.minutes,
    );
  }

  return categories.flatMap((category) =>
    WEEKDAY_DISPLAY_ORDER.map((weekday) => {
      const denominator = denominatorByWeekday.get(weekday) ?? 0;
      const x = WEEKDAY_LABEL_BY_VALUE.get(weekday) ?? "";
      const total = minutesByWeekdayAndCategory.get(`${weekday}:${category}`) ?? 0;
      return {
        days: denominator,
        totalMinutes: total,
        value: denominator === 0 ? null : Math.round((total / denominator) * 10) / 10,
        x,
        y: category,
      };
    }),
  );
}
