import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type MonthDay = FunctionReturnType<typeof api.history.month>["days"][number];
export type MonthEvent = FunctionReturnType<typeof api.history.monthBreakdown>["events"][number];
export type DayBreakdown = FunctionReturnType<typeof api.history.dayBreakdown>;
export type WeekBreakdown = FunctionReturnType<typeof api.history.weekBreakdown>;
export type MonthBreakdown = FunctionReturnType<typeof api.history.monthBreakdown>;
export type CategoryBreakdown = MonthBreakdown["byCategory"][number];
export type BreakdownRow = DayBreakdown["rows"][number];
export type WeekPage = FunctionReturnType<typeof api.history.week>;
export type WeekEvent = WeekPage["events"][number];
export type YearHeatmap = FunctionReturnType<typeof api.history.yearHeatmap>;
export type YearHeatmapDay = YearHeatmap["days"][number];
export type HeatmapDay = YearHeatmapDay;
