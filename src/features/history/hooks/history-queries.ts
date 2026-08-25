import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

//? 並列取得(useSuspenseQueries)側もこれらのファクトリを使う。convexQuery(...) の引数を
//? コンポーネントに散らさないための SSoT。
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
  return useSuspenseQuery(historyMonthBreakdownQuery(todayJst, yearMonth));
}

export function useHistoryWeek(dateJst: DateJst, todayJst: DateJst) {
  return useSuspenseQuery(historyWeekQuery(dateJst, todayJst));
}
