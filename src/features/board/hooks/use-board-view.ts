import type { ScheduleViewLevel } from "@mantine/schedule";
import { isFutureDateJst, mondayOfWeek, type DateJst } from "~domain/jst";

import { boardRoute } from "~/features/board/lib/board-route-api";
import type {
  BoardScheduleView,
  BoardSearch,
  BoardTab,
} from "~/features/board/schemas/board-search-schema";
import { useTodayJst } from "~/hooks/use-today-jst";

function yearMonthFromDateJst(dateJst: DateJst): string {
  return dateJst.slice(0, 7);
}

function monthDateFromYearMonth(yearMonth: string): Date {
  return new Date(`${yearMonth}-01T12:00:00+09:00`);
}

export function scheduleAnchorDateJst(
  view: BoardScheduleView,
  selectedDateJst: DateJst,
  weekAnchor: DateJst,
  yearMonth: string,
): DateJst {
  switch (view) {
    case "day":
      return selectedDateJst;
    case "week":
      return weekAnchor;
    case "month":
      return `${yearMonth}-01`;
    case "year":
      return `${selectedDateJst.slice(0, 4)}-01-01`;
  }
}

export function deriveBoardView(search: BoardSearch, today: DateJst) {
  const tab: BoardTab = search.tab ?? "kanban";
  const scheduleView: BoardScheduleView = search.view ?? "week";
  const requestedDate = search.date ?? today;
  const selectedDateJst: DateJst = isFutureDateJst(requestedDate, today) ? today : requestedDate;
  const todayYearMonth = yearMonthFromDateJst(today);
  const requestedMonth = search.month ?? yearMonthFromDateJst(selectedDateJst);
  const yearMonth = requestedMonth > todayYearMonth ? todayYearMonth : requestedMonth;
  const requestedWeek = search.week ?? mondayOfWeek(selectedDateJst);
  const weekAnchor: DateJst = isFutureDateJst(requestedWeek, today)
    ? mondayOfWeek(today)
    : requestedWeek;
  const scheduleAnchor = scheduleAnchorDateJst(
    scheduleView,
    selectedDateJst,
    weekAnchor,
    yearMonth,
  );

  return {
    monthDate: monthDateFromYearMonth(yearMonth),
    scheduleAnchor,
    scheduleView,
    selectedDateJst,
    tab,
    weekAnchor,
    yearMonth,
  };
}

/**
 * `/board` ルート上でのみ使う。search の read/write と derive を集約する。
 */
export type BoardViewState = ReturnType<typeof deriveBoardView> & {
  setDate: (dateJst: DateJst) => void;
  setMonth: (yearMonth: string) => void;
  resetMonthViewToToday: () => void;
  setScheduleView: (nextView: ScheduleViewLevel) => void;
  setTab: (tab: BoardTab) => void;
  setWeek: (weekAnchor: DateJst) => void;
  today: DateJst;
};

export function useBoardView(): BoardViewState {
  const search = boardRoute.useSearch();
  const navigate = boardRoute.useNavigate();
  const today = useTodayJst();
  const view = deriveBoardView(search, today);

  return {
    ...view,
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
    resetMonthViewToToday: () => {
      void navigate({
        search: (current) => ({
          ...current,
          date: undefined,
          month: undefined,
        }),
      });
    },
    setScheduleView: (nextView: ScheduleViewLevel) => {
      void navigate({
        search: (current) => ({
          ...current,
          view: nextView === "week" ? undefined : nextView,
        }),
      });
    },
    setTab: (tab: BoardTab) => {
      void navigate({
        search: (current) => ({
          ...current,
          tab: tab === "kanban" ? undefined : tab,
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
