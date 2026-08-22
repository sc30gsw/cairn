import { ScheduleHeader } from "@mantine/schedule";
import dayjs from "dayjs";

import {
  BoardScheduleNavigationFrame,
  BoardScheduleViewSelect,
  monthDateString,
  yearMonthOf,
  type BoardScheduleNavigationProps,
} from "~/features/board/components/board-schedule-navigation-shared";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

export function BoardScheduleMonthNavigation({
  monthDate,
  onMonthChange,
  onMonthViewToday,
  onViewChange,
  scheduleView,
  todayJst,
}: Pick<
  BoardScheduleNavigationProps,
  "monthDate" | "onMonthChange" | "onMonthViewToday" | "onViewChange" | "scheduleView" | "todayJst"
>) {
  const monthAnchor = monthDateString(monthDate);
  const nextDisabled = yearMonthOf(monthAnchor) >= yearMonthOf(todayJst);
  const setDate = (value: string) => {
    if (yearMonthOf(value) > yearMonthOf(todayJst)) {
      return;
    }
    onMonthChange(yearMonthOf(value));
  };

  return (
    <BoardScheduleNavigationFrame
      center={
        <ScheduleHeader.MonthYearSelect
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
      nextDisabled={nextDisabled}
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
  const nextDisabled = nextYearStart > todayJst;

  return (
    <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
      <ScheduleHeader.Previous
        aria-label={SCHEDULE_LABELS_JA.previous}
        onClick={() => onDateChange(`${Number(selectedDateJst.slice(0, 4)) - 1}-01-01`)}
      />
      <ScheduleHeader.MonthYearSelect
        monthValue={0}
        onMonthChange={() => undefined}
        onYearChange={(yearValue) => {
          const next = `${yearValue}-01-01`;
          if (yearMonthOf(next) > yearMonthOf(todayJst)) {
            return;
          }
          onDateChange(next);
        }}
        popoverProps={{ withinPortal: true }}
        yearValue={Number(selectedDateJst.slice(0, 4))}
      />
      <ScheduleHeader.Next
        aria-label={SCHEDULE_LABELS_JA.next}
        disabled={nextDisabled}
        interactive={!nextDisabled}
        onClick={() => {
          if (!nextDisabled) {
            onDateChange(nextYearStart);
          }
        }}
      />
      <ScheduleHeader.Today
        aria-label={SCHEDULE_LABELS_JA.today}
        onClick={() => onDateChange(todayJst)}
      />
      <BoardScheduleViewSelect onViewChange={onViewChange} scheduleView={scheduleView} />
    </ScheduleHeader>
  );
}
