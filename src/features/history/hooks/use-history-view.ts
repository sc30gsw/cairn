import { getRouteApi } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";
import { mondayOfWeek, todayJst } from "~domain/jst";

import type { AnalysisScope } from "~/features/history/schemas/analysis-scope-schema";
import type {
  HistorySearch,
  HistoryTab,
} from "~/features/history/schemas/history-search-schema";

/** `/history` 専用 — HistoryPage 配下からのみ import すること */
const historyRoute = getRouteApi("/history");

export function yearMonthFromDateJst(dateJst: DateJst): string {
  return dateJst.slice(0, 7);
}

export function monthDateFromYearMonth(yearMonth: string): Date {
  return new Date(`${yearMonth}-01T12:00:00+09:00`);
}

export function deriveHistoryView(search: HistorySearch, today: DateJst) {
  const tab: HistoryTab = search.tab ?? "month";
  const selectedDateJst: DateJst = search.date ?? today;
  const analysisScope: AnalysisScope = search.scope ?? "day";
  const yearMonth = search.month ?? yearMonthFromDateJst(selectedDateJst);
  const weekAnchor: DateJst = search.week ?? mondayOfWeek(selectedDateJst);

  return {
    analysisScope,
    monthDate: monthDateFromYearMonth(yearMonth),
    selectedDateJst,
    tab,
    weekAnchor,
    yearMonth,
  };
}

/**
 * `/history` ルート上でのみ使う。search の read/write と derive を集約する。
 */
export function useHistoryView() {
  const search = historyRoute.useSearch();
  const navigate = historyRoute.useNavigate();
  const today = todayJst();
  const view = deriveHistoryView(search, today);

  return {
    ...view,
    openDayAnalysis: (dateJst: DateJst) => {
      void navigate({
        search: (current) => ({
          ...current,
          date: dateJst === today ? undefined : dateJst,
          month:
            yearMonthFromDateJst(dateJst) === yearMonthFromDateJst(today)
              ? undefined
              : yearMonthFromDateJst(dateJst),
          scope: "day",
          tab: "analysis",
        }),
      });
    },
    setDate: (dateJst: DateJst) => {
      void navigate({
        search: (current) => ({
          ...current,
          date: dateJst === today ? undefined : dateJst,
        }),
      });
    },
    setMonth: (yearMonth: string) => {
      void navigate({
        search: (current) => ({
          ...current,
          month: yearMonth === yearMonthFromDateJst(today) ? undefined : yearMonth,
        }),
      });
    },
    setScope: (scope: AnalysisScope) => {
      void navigate({
        search: (current) => ({
          ...current,
          scope: scope === "day" ? undefined : scope,
        }),
      });
    },
    setTab: (tab: HistoryTab) => {
      void navigate({
        search: (current) => ({
          ...current,
          tab: tab === "month" ? undefined : tab,
        }),
      });
    },
    setWeek: (weekAnchor: DateJst) => {
      const defaultWeek = mondayOfWeek(search.date ?? today);
      void navigate({
        search: (current) => ({
          ...current,
          week: weekAnchor === defaultWeek ? undefined : weekAnchor,
        }),
      });
    },
    today,
  };
}
