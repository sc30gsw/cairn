import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type MonthEvent = FunctionReturnType<
  typeof api.queries.history.monthBreakdown.monthBreakdown
>["events"][number];
export type DayBreakdown = FunctionReturnType<typeof api.queries.history.dayBreakdown.dayBreakdown>;
export type WeekBreakdown = FunctionReturnType<
  typeof api.queries.history.weekBreakdown.weekBreakdown
>;
export type MonthBreakdown = FunctionReturnType<
  typeof api.queries.history.monthBreakdown.monthBreakdown
>;
export type CategoryBreakdown = MonthBreakdown["byCategory"][number];
export type BreakdownRow = DayBreakdown["rows"][number];
export type WeekPage = FunctionReturnType<typeof api.queries.history.week.week>;
export type WeekEvent = WeekPage["events"][number];
export type YearHeatmap = FunctionReturnType<typeof api.queries.history.yearHeatmap.yearHeatmap>;
export type YearHeatmapDay = YearHeatmap["days"][number];
export type HeatmapDay = YearHeatmapDay;
