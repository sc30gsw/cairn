import { addDaysJst } from "~domain/jst";

import type { HeatmapDay } from "~/features/history/types/history";

export const YEAR_HEATMAP_DAYS = 365;

export type { HeatmapDay };

export type HeatmapLegendEntry = {
  backgroundColor: string;
  label: string;
};

export const HEATMAP_CHART_COLORS = [
  "var(--mantine-color-blue-1)",
  "var(--mantine-color-blue-2)",
  "var(--mantine-color-blue-3)",
  "var(--mantine-color-blue-4)",
] as const;

export const HEATMAP_DOMAIN: [number, number] = [1, 120];

export const REST_HEATMAP_FILL = "var(--mantine-color-default-hover)";

export const HEATMAP_MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
] as const;

export const HEATMAP_WEEKDAY_LABELS = ["", "月", "", "水", "", "金", ""] as const;

export function yearHeatmapRange(todayJst: string): { endDate: string; startDate: string } {
  return {
    endDate: todayJst,
    startDate: addDaysJst(todayJst, -(YEAR_HEATMAP_DAYS - 1)),
  };
}

export function buildHeatmapChartData(days: HeatmapDay[]): Record<string, number> {
  return Object.fromEntries(
    days.filter((day) => !day.isRest && day.minutes > 0).map((day) => [day.dateJst, day.minutes]),
  );
}

export function isRestHeatmapDay(day: HeatmapDay | undefined): boolean {
  return day === undefined || day.isRest || day.minutes === 0;
}

export function formatHeatmapTooltip(
  date: string,
  value: null | number,
  day: HeatmapDay | undefined,
): string {
  if (day === undefined || day.isRest) {
    return `${date} — 休養`;
  }
  const minutes = value ?? day.minutes;
  return `${date} — ${minutes}分（均${Math.round(day.movingAverage)}分）`;
}

export const HEATMAP_LEGEND: HeatmapLegendEntry[] = [
  { backgroundColor: "var(--mantine-color-default-hover)", label: "休養（記録なし）" },
  { backgroundColor: "var(--mantine-color-blue-1)", label: "1〜29分" },
  { backgroundColor: "var(--mantine-color-blue-2)", label: "30〜59分" },
  { backgroundColor: "var(--mantine-color-blue-3)", label: "60〜119分" },
  { backgroundColor: "var(--mantine-color-blue-4)", label: "120分+" },
];
