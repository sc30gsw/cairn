import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useHistoryMonthBreakdown(todayJst: string, yearMonth: string) {
  return useSuspenseQuery(
    convexQuery(api.queries.history.monthBreakdown.monthBreakdown, { todayJst, yearMonth }),
  );
}

export function useHistoryWeek(dateJst: string) {
  return useSuspenseQuery(convexQuery(api.queries.history.week.week, { dateJst }));
}

export function useHistoryWeekBreakdown(dateJst: string) {
  return useSuspenseQuery(convexQuery(api.queries.history.weekBreakdown.weekBreakdown, { dateJst }));
}

export function useHistoryDayBreakdown(dateJst: string) {
  return useSuspenseQuery(convexQuery(api.queries.history.dayBreakdown.dayBreakdown, { dateJst }));
}

export function useHistoryYearHeatmap(todayJst: string) {
  return useSuspenseQuery(convexQuery(api.queries.history.yearHeatmap.yearHeatmap, { todayJst }));
}
