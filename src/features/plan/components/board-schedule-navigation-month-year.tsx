import { ScheduleHeader } from "@mantine/schedule";
import dayjs from "dayjs";

import {
  BoardScheduleNavigationFrame,
  BoardScheduleViewSelect,
  monthDateString,
  yearMonthOf,
  type BoardScheduleNavigationProps,
} from "~/features/plan/components/board-schedule-navigation-shared";
import { MONTH_PICKER_VALUE_FORMAT, YEAR_PICKER_VALUE_FORMAT } from "~/lib/date-display-formats";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

export function BoardScheduleMonthNavigation({
  monthDate,
  onMonthChange,
  onMonthViewToday,
  onViewChange,
  scheduleView,
}: Pick<
  BoardScheduleNavigationProps,
  "monthDate" | "onMonthChange" | "onMonthViewToday" | "onViewChange" | "scheduleView"
>) {
  const monthAnchor = monthDateString(monthDate);
  const setDate = (value: string) => {
    onMonthChange(yearMonthOf(value));
  };

  return (
    <BoardScheduleNavigationFrame
      center={
        <ScheduleHeader.MonthYearSelect
          labelFormat={MONTH_PICKER_VALUE_FORMAT}
          monthValue={dayjs(monthAnchor).month()}
          onMonthChange={(monthValue) => {
            setDate(dayjs(monthAnchor).month(monthValue).startOf("month").format("YYYY-MM-DD"));
          }}
          onYearChange={(yearValue) => {
            setDate(dayjs(monthAnchor).year(yearValue).startOf("month").format("YYYY-MM-DD"));
          }}
          popoverProps={{ withinPortal: true }}
          yearValue={dayjs(monthAnchor).year()}
        />
      }
      nextDisabled={false}
      onNext={() =>
        setDate(dayjs(monthAnchor).add(1, "month").startOf("month").format("YYYY-MM-DD"))
      }
      onPrevious={() =>
        setDate(dayjs(monthAnchor).add(-1, "month").startOf("month").format("YYYY-MM-DD"))
      }
      onToday={onMonthViewToday}
      onViewChange={onViewChange}
      scheduleView={scheduleView}
    />
  );
}

export function BoardScheduleYearNavigation({
  onDateChange,
  onViewChange,
  scheduleView,
  selectedDateJst,
  todayJst,
}: Pick<
  BoardScheduleNavigationProps,
  "onDateChange" | "onViewChange" | "scheduleView" | "selectedDateJst" | "todayJst"
>) {
  const nextYearStart = `${Number(selectedDateJst.slice(0, 4)) + 1}-01-01`;

  return (
    <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
      <ScheduleHeader.Previous
        aria-label={SCHEDULE_LABELS_JA.previous}
        onClick={() => onDateChange(`${Number(selectedDateJst.slice(0, 4)) - 1}-01-01`)}
      />
      <ScheduleHeader.MonthYearSelect
        labelFormat={YEAR_PICKER_VALUE_FORMAT}
        withMonths={false}
        onYearChange={(yearValue) => {
          onDateChange(`${yearValue}-01-01`);
        }}
        popoverProps={{ withinPortal: true }}
        yearValue={Number(selectedDateJst.slice(0, 4))}
      />
      <ScheduleHeader.Next
        aria-label={SCHEDULE_LABELS_JA.next}
        onClick={() => onDateChange(nextYearStart)}
      />
      <ScheduleHeader.Today
        aria-label={SCHEDULE_LABELS_JA.today}
        onClick={() => onDateChange(todayJst)}
      />
      <BoardScheduleViewSelect onViewChange={onViewChange} scheduleView={scheduleView} />
    </ScheduleHeader>
  );
}
