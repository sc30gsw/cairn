import type { ScheduleViewLevel } from "@mantine/schedule";
import { compareDateJst, mondayOfWeek, planWeekAheadMaxDateJst, type DateJst } from "~domain/jst";

import { planRoute } from "~/features/plan/lib/plan-route-api";
import type {
  PlanScheduleView,
  PlanSearch,
  PlanTab,
} from "~/features/plan/schemas/plan-search-schema";
import { useTodayJst } from "~/hooks/use-today-jst";

function yearMonthFromDateJst(dateJst: DateJst): string {
  return dateJst.slice(0, 7);
}

function monthDateFromYearMonth(yearMonth: string): Date {
  return new Date(`${yearMonth}-01T12:00:00+09:00`);
}

export function scheduleAnchorDateJst(
  view: PlanScheduleView,
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

export function derivePlanView(search: PlanSearch, today: DateJst) {
  const tab: PlanTab = search.tab ?? "plan";
  const scheduleView: PlanScheduleView = search.view ?? "day";
  const requestedDate = search.date ?? today;
  const maxPlanDateJst = planWeekAheadMaxDateJst(today);
  const selectedDateJst: DateJst =
    compareDateJst(requestedDate, maxPlanDateJst) > 0 ? maxPlanDateJst : requestedDate;
  const yearMonth = search.month ?? yearMonthFromDateJst(selectedDateJst);
  const weekAnchor: DateJst = search.week ?? mondayOfWeek(selectedDateJst);
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

export type PlanViewState = ReturnType<typeof derivePlanView> & {
  resetMonthViewToToday: () => void;
  setDate: (dateJst: DateJst) => void;
  setMonth: (yearMonth: string) => void;
  setScheduleView: (nextView: ScheduleViewLevel) => void;
  setTab: (tab: PlanTab) => void;
  setWeek: (weekAnchor: DateJst) => void;
  today: DateJst;
};

export function usePlanView(): PlanViewState {
  const search = planRoute.useSearch();
  const navigate = planRoute.useNavigate();
  const today = useTodayJst();
  const view = derivePlanView(search, today);

  return {
    ...view,
    resetMonthViewToToday: () => {
      void navigate({
        search: (current) => ({
          ...current,
          date: undefined,
          month: undefined,
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
    setScheduleView: (nextView: ScheduleViewLevel) => {
      void navigate({
        search: (current) => ({
          ...current,
          view: nextView === "day" ? undefined : nextView,
        }),
      });
    },
    setTab: (tab: PlanTab) => {
      void navigate({
        search: (current) => ({
          ...current,
          tab: tab === "plan" ? undefined : tab,
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
