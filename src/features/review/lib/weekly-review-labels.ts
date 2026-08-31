import { WEEKDAY_NAMES } from "~domain/catalog";
import { weekdayFromDateJst } from "~domain/jst";

import type { WeeklyReviewDay } from "~/features/review/types/weekly-review";

export function weekdayShortLabel(dateJst: string): string {
  return WEEKDAY_NAMES[weekdayFromDateJst(dateJst)].slice(0, 1);
}

export function monthDayLabel(dateJst: string): string {
  return `${dateJst.slice(5, 7)}/${dateJst.slice(8, 10)}`;
}

function weekOfMonth(dateJst: string): number {
  return Math.floor((Number(dateJst.slice(8, 10)) - 1) / 7) + 1;
}

export function weekRangeLabel(weekStart: string, weekEnd: string): string {
  const range = `${monthDayLabel(weekStart)} ${weekdayShortLabel(weekStart)} 〜 ${monthDayLabel(weekEnd)} ${weekdayShortLabel(weekEnd)}`;
  if (weekStart.slice(0, 7) !== weekEnd.slice(0, 7)) {
    return range;
  }
  return `${Number(weekStart.slice(5, 7))}月第${weekOfMonth(weekStart)}週（${range}）`;
}

export function deltaDirection(current: number, previous: number): "down" | "flat" | "up" {
  if (current > previous) {
    return "up";
  }
  if (current < previous) {
    return "down";
  }
  return "flat";
}

function signedLabel(delta: number, unit: string): string {
  if (delta === 0) {
    return `±0${unit}`;
  }
  return delta > 0 ? `+${delta}${unit}` : `${delta}${unit}`;
}

export function previousWeekLabel(current: number, previous: number, unit: string): string {
  if (previous === 0) {
    return "先週の記録はありません";
  }
  return `先週 ${previous}${unit}（${signedLabel(current - previous, unit)}）`;
}

export function dailyAverageMinutes(confirmedMinutes: number, elapsedDays: number): number {
  return elapsedDays === 0 ? 0 : Math.round(confirmedMinutes / elapsedDays);
}

export function percentOf(current: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((current / total) * 100));
}

export function historyWeekAnalysisLink(weekStart: string) {
  return {
    search: { scope: "week" as const, tab: "analysis" as const, week: weekStart },
    to: "/history" as const,
  };
}

export function digestCellLabel(
  day: Pick<WeeklyReviewDay, "confirmedCount" | "dateJst" | "digestRate" | "plannedCount">,
  todayJst: string,
): string {
  if (day.digestRate === null) {
    return day.dateJst === todayJst ? "—（今日）" : "—";
  }
  return `${day.confirmedCount}/${day.plannedCount}（${Math.round(day.digestRate * 100)}%）`;
}
