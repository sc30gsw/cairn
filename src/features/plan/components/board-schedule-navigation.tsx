import {
  BoardScheduleDayNavigation,
  BoardScheduleWeekNavigation,
} from "~/features/plan/components/board-schedule-navigation-day-week";
import {
  BoardScheduleMonthNavigation,
  BoardScheduleYearNavigation,
} from "~/features/plan/components/board-schedule-navigation-month-year";
import type { BoardScheduleNavigationProps } from "~/features/plan/components/board-schedule-navigation-shared";

export type { BoardScheduleNavigationProps } from "~/features/plan/components/board-schedule-navigation-shared";

export function BoardScheduleNavigation(props: BoardScheduleNavigationProps) {
  switch (props.scheduleView) {
    case "day":
      return <BoardScheduleDayNavigation {...props} />;
    case "week":
      return <BoardScheduleWeekNavigation {...props} />;
    case "month":
      return <BoardScheduleMonthNavigation {...props} />;
    case "year":
      return <BoardScheduleYearNavigation {...props} />;
  }
}
