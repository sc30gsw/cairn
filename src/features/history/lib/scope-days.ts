import { prop, reverse, sortBy } from "remeda";
import type { Condition } from "~domain/conditions";
import { CONDITIONS } from "~domain/conditions";
import type { DateJst } from "~domain/jst";

import type { AnalysisScope } from "~/features/history/schemas/analysis-scope-schema";
import type { HeatmapDay, MonthBreakdown, WeekBreakdown } from "~/features/history/types/history";

export function daysInAnalysisScope(
  scope: AnalysisScope,
  selectedDateJst: DateJst,
  week: WeekBreakdown,
  month: MonthBreakdown,
  heatmapDays: readonly HeatmapDay[],
): HeatmapDay[] {
  if (scope === "day") {
    const fromMonth = month.days.find((day) => day.dateJst === selectedDateJst);
    const fromHeatmap = heatmapDays.find((day) => day.dateJst === selectedDateJst);
    const day = fromMonth ?? fromHeatmap;
    return day === undefined ? [] : [day];
  }

  if (scope === "week") {
    // Week breakdown rows omit memo/condition; heatmap days carry both for the week range.
    return heatmapDays.filter(
      (day) => day.dateJst >= week.weekStart && day.dateJst <= week.weekEnd,
    );
  }

  return month.days;
}

export function sortDaysNewestFirst(days: readonly HeatmapDay[]): HeatmapDay[] {
  return reverse(sortBy(days, prop("dateJst")));
}

export function daysWithMemo(days: readonly HeatmapDay[]): HeatmapDay[] {
  return sortDaysNewestFirst(days.filter((day) => day.memo !== null && day.memo.length > 0));
}

export type ConditionAvgMinutesRow = {
  avgMinutes: number;
  condition: Condition;
  dayCount: number;
};

export function avgMinutesByCondition(days: readonly HeatmapDay[]): ConditionAvgMinutesRow[] {
  const totals = Object.fromEntries(CONDITIONS.map((condition) => [condition, 0])) as Record<
    Condition,
    number
  >;
  const counts = Object.fromEntries(CONDITIONS.map((condition) => [condition, 0])) as Record<
    Condition,
    number
  >;

  for (const day of days) {
    if (day.condition === null) {
      continue;
    }
    totals[day.condition] += day.minutes;
    counts[day.condition] += 1;
  }

  return CONDITIONS.flatMap((condition) => {
    const dayCount = counts[condition];
    if (dayCount === 0) {
      return [];
    }
    return [
      {
        avgMinutes: Math.round(totals[condition] / dayCount),
        condition,
        dayCount,
      },
    ];
  });
}

export type MemoConditionGroup = {
  condition: Condition | null;
  days: HeatmapDay[];
};

export function groupMemosByCondition(days: readonly HeatmapDay[]): MemoConditionGroup[] {
  const memoDays = daysWithMemo(days);
  const byCondition = new Map<Condition | null, HeatmapDay[]>();

  for (const day of memoDays) {
    const bucket = byCondition.get(day.condition) ?? [];
    bucket.push(day);
    byCondition.set(day.condition, bucket);
  }

  const groups: MemoConditionGroup[] = [];

  for (const condition of CONDITIONS) {
    const bucket = byCondition.get(condition);
    if (bucket === undefined || bucket.length === 0) {
      continue;
    }
    groups.push({ condition, days: sortDaysNewestFirst(bucket) });
  }

  const memoOnly = byCondition.get(null);
  if (memoOnly !== undefined && memoOnly.length > 0) {
    groups.push({ condition: null, days: sortDaysNewestFirst(memoOnly) });
  }

  return groups;
}
