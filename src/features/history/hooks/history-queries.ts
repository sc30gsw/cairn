import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import {
  useOptionalHistoryMonthBreakdownLiveQuery,
  useOptionalHistoryWeekLiveQuery,
} from "~/lib/tanstack-db/collections";

export function historyMonthBreakdownQuery(todayJst: DateJst, yearMonth: string) {
  return convexQuery(api.queries.history.monthBreakdown.monthBreakdown, { todayJst, yearMonth });
}

export function historyWeekQuery(dateJst: DateJst, todayJst: DateJst) {
  return convexQuery(api.queries.history.week.week, { dateJst, todayJst });
}

export function historyWeekBreakdownQuery(dateJst: DateJst, todayJst: DateJst) {
  return convexQuery(api.queries.history.weekBreakdown.weekBreakdown, { dateJst, todayJst });
}

export function historyDayBreakdownQuery(dateJst: DateJst, todayJst: DateJst) {
  return convexQuery(api.queries.history.dayBreakdown.dayBreakdown, { dateJst, todayJst });
}

export function historyYearHeatmapQuery(todayJst: DateJst) {
  return convexQuery(api.queries.history.yearHeatmap.yearHeatmap, { todayJst });
}

export function historyPresetReviewQuery(todayJst: DateJst) {
  return convexQuery(api.queries.history.presetReview.presetReview, { todayJst });
}

export function useHistoryMonthBreakdown(todayJst: DateJst, yearMonth: string) {
  const live = useOptionalHistoryMonthBreakdownLiveQuery({ todayJst, yearMonth });
  const queryResult = useSuspenseQuery(historyMonthBreakdownQuery(todayJst, yearMonth));
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function useHistoryWeek(dateJst: DateJst, todayJst: DateJst) {
  const live = useOptionalHistoryWeekLiveQuery({ dateJst, todayJst });
  const queryResult = useSuspenseQuery(historyWeekQuery(dateJst, todayJst));
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
