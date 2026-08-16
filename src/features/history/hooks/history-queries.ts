import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

export function useHistoryMonthBreakdown(todayJst: DateJst, yearMonth: string) {
  return useSuspenseQuery(
    convexQuery(api.queries.history.monthBreakdown.monthBreakdown, { todayJst, yearMonth }),
  );
}

export function useHistoryWeek(dateJst: DateJst) {
  return useSuspenseQuery(convexQuery(api.queries.history.week.week, { dateJst }));
}

export function useHistoryWeekBreakdown(dateJst: DateJst) {
  return useSuspenseQuery(
    convexQuery(api.queries.history.weekBreakdown.weekBreakdown, { dateJst }),
  );
}

export function useHistoryDayBreakdown(dateJst: DateJst) {
  return useSuspenseQuery(convexQuery(api.queries.history.dayBreakdown.dayBreakdown, { dateJst }));
}

export function useHistoryYearHeatmap(todayJst: DateJst) {
  return useSuspenseQuery(convexQuery(api.queries.history.yearHeatmap.yearHeatmap, { todayJst }));
}
