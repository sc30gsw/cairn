import { addDaysJst, isFutureDateJst, mondayOfWeek } from "~domain/jst";

import {
  BoardScheduleDateControl,
  BoardScheduleNavigationFrame,
  BoardScheduleWeekPicker,
  type BoardScheduleNavigationProps,
} from "~/features/board/components/board-schedule-navigation-shared";
import {
  DAY_NAVIGATION_DATE_FORMAT,
  formatDayNavigationLabel,
} from "~/features/board/lib/board-schedule-navigation-labels";

export function BoardScheduleDayNavigation({
  onDateChange,
  onViewChange,
  scheduleView,
  selectedDateJst,
  todayJst,
}: Pick<
  BoardScheduleNavigationProps,
  "onDateChange" | "onViewChange" | "scheduleView" | "selectedDateJst" | "todayJst"
>) {
  const nextDisabled = selectedDateJst >= todayJst;

  return (
    <BoardScheduleNavigationFrame
      center={
        <BoardScheduleDateControl
          ariaLabel="日付を選択"
          label={formatDayNavigationLabel(selectedDateJst)}
          onChange={(value) => {
            if (typeof value === "string" && !isFutureDateJst(value, todayJst)) {
              onDateChange(value);
            }
          }}
          todayJst={todayJst}
          value={selectedDateJst}
          valueFormat={DAY_NAVIGATION_DATE_FORMAT}
        />
      }
      nextDisabled={nextDisabled}
      onNext={() => onDateChange(addDaysJst(selectedDateJst, 1))}
      onPrevious={() => onDateChange(addDaysJst(selectedDateJst, -1))}
      onToday={() => onDateChange(todayJst)}
      onViewChange={onViewChange}
      scheduleView={scheduleView}
    />
  );
}

export function BoardScheduleWeekNavigation({
  onDateChange,
  onViewChange,
  onWeekChange,
  scheduleView,
  selectedDateJst,
  todayJst,
  weekAnchor,
}: Pick<
  BoardScheduleNavigationProps,
  | "onDateChange"
  | "onViewChange"
  | "onWeekChange"
  | "scheduleView"
  | "selectedDateJst"
  | "todayJst"
  | "weekAnchor"
>) {
  const nextWeek = addDaysJst(weekAnchor, 7);
  const nextDisabled = nextWeek > todayJst;

  return (
    <BoardScheduleNavigationFrame
      center={
        <BoardScheduleWeekPicker
          onDateChange={onDateChange}
          onWeekChange={onWeekChange}
          selectedDateJst={selectedDateJst}
          todayJst={todayJst}
          weekAnchor={weekAnchor}
        />
      }
      nextDisabled={nextDisabled}
      onNext={() => onWeekChange(nextWeek)}
      onPrevious={() => onWeekChange(addDaysJst(weekAnchor, -7))}
      onToday={() => onWeekChange(mondayOfWeek(todayJst))}
      onViewChange={onViewChange}
      scheduleView={scheduleView}
    />
  );
}
