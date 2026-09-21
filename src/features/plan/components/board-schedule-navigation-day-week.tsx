import { addDaysJst, mondayOfWeek } from "~domain/jst";

import {
  BoardScheduleDateControl,
  BoardScheduleNavigationFrame,
  BoardScheduleWeekPicker,
  type BoardScheduleNavigationProps,
} from "~/features/plan/components/board-schedule-navigation-shared";
import { formatDayNavigationLabel } from "~/features/plan/lib/board-schedule-navigation-labels";

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
  return (
    <BoardScheduleNavigationFrame
      center={
        <BoardScheduleDateControl
          ariaLabel="日付を選択"
          label={formatDayNavigationLabel(selectedDateJst)}
          onChange={(value) => {
            if (typeof value === "string") {
              onDateChange(value);
            }
          }}
          value={selectedDateJst}
        />
      }
      nextDisabled={false}
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

  return (
    <BoardScheduleNavigationFrame
      center={
        <BoardScheduleWeekPicker
          onDateChange={onDateChange}
          onWeekChange={onWeekChange}
          selectedDateJst={selectedDateJst}
          weekAnchor={weekAnchor}
        />
      }
      nextDisabled={false}
      onNext={() => onWeekChange(nextWeek)}
      onPrevious={() => onWeekChange(addDaysJst(weekAnchor, -7))}
      onToday={() => onWeekChange(mondayOfWeek(todayJst))}
      onViewChange={onViewChange}
      scheduleView={scheduleView}
    />
  );
}
