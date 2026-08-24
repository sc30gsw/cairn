import { DatePickerInput } from "@mantine/dates";
import { ScheduleHeader, getStartOfWeek, type ScheduleViewLevel } from "@mantine/schedule";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { isFutureDateJst, mondayOfWeek, type DateJst } from "~domain/jst";

import { formatWeekNavigationLabel } from "~/features/board/lib/board-schedule-navigation-labels";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";
import { calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { learningDatePickerProps } from "~/lib/learning-date-picker-props";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";
import { cn } from "~/lib/utils";

import classes from "~/features/board/components/board-schedule-navigation.module.css";

export type BoardScheduleNavigationProps = {
  monthDate: Date;
  onDateChange: (dateJst: DateJst) => void;
  onMonthChange: (yearMonth: string) => void;
  onMonthViewToday: () => void;
  onViewChange: (view: ScheduleViewLevel) => void;
  onWeekChange: (weekAnchor: DateJst) => void;
  scheduleView: BoardScheduleView;
  selectedDateJst: DateJst;
  todayJst: DateJst;
  weekAnchor: DateJst;
};

export function yearMonthOf(value: string): string {
  return value.slice(0, 7);
}

export function monthDateString(monthDate: Date): string {
  return `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;
}

function sharedDatePickerProps(todayJst: DateJst) {
  return learningDatePickerProps(todayJst);
}

function pickDateInWeek(
  value: string | null,
  todayJst: DateJst,
  onDateChange: (dateJst: DateJst) => void,
  onWeekChange: (weekAnchor: DateJst) => void,
) {
  if (typeof value !== "string" || isFutureDateJst(value, todayJst)) {
    return;
  }
  onDateChange(value);
  onWeekChange(mondayOfWeek(value));
}

export function BoardScheduleDateControl({
  ariaLabel,
  className,
  label,
  onChange,
  todayJst,
  value,
  valueFormat,
}: {
  ariaLabel: string;
  className?: string;
  label: string;
  onChange: (value: string | null) => void;
  todayJst: DateJst;
  value: DateJst;
  valueFormat: string;
}) {
  return (
    <ScheduleHeader.Control
      className={cn(classes.dateControl, className)}
      component="div"
      interactive={false}
    >
      <span className={classes.dateControlLabel}>{label}</span>
      <DatePickerInput
        aria-label={ariaLabel}
        className={classes.datePickerOverlay}
        classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
        onChange={onChange}
        value={value}
        valueFormat={valueFormat}
        {...sharedDatePickerProps(todayJst)}
      />
    </ScheduleHeader.Control>
  );
}

export function BoardScheduleWeekPicker({
  onDateChange,
  onWeekChange,
  selectedDateJst,
  todayJst,
  weekAnchor,
}: {
  onDateChange: (dateJst: DateJst) => void;
  onWeekChange: (weekAnchor: DateJst) => void;
  selectedDateJst: DateJst;
  todayJst: DateJst;
  weekAnchor: DateJst;
}) {
  const weekStart = getStartOfWeek({ date: weekAnchor, firstDayOfWeek: 1 });
  const weekEnd = dayjs(weekStart).add(6, "day").format("YYYY-MM-DD");
  const pickerValue =
    selectedDateJst >= weekStart && selectedDateJst <= weekEnd ? selectedDateJst : weekAnchor;

  return (
    <BoardScheduleDateControl
      ariaLabel="週を選択"
      className={classes.weekDateControl}
      label={formatWeekNavigationLabel(weekAnchor)}
      onChange={(value) => pickDateInWeek(value, todayJst, onDateChange, onWeekChange)}
      todayJst={todayJst}
      value={pickerValue}
      valueFormat="M/D"
    />
  );
}

export function BoardScheduleViewSelect({
  onViewChange,
  scheduleView,
}: {
  onViewChange: (view: ScheduleViewLevel) => void;
  scheduleView: BoardScheduleView;
}) {
  return <ScheduleHeader.ViewSelect onChange={onViewChange} value={scheduleView} />;
}

export function BoardScheduleNavigationFrame({
  center,
  nextDisabled,
  onNext,
  onPrevious,
  onToday,
  onViewChange,
  scheduleView,
}: {
  center: ReactNode;
  nextDisabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
  onViewChange: (view: ScheduleViewLevel) => void;
  scheduleView: BoardScheduleView;
}) {
  return (
    <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
      <ScheduleHeader.Previous aria-label={SCHEDULE_LABELS_JA.previous} onClick={onPrevious} />
      {center}
      <ScheduleHeader.Next
        aria-label={SCHEDULE_LABELS_JA.next}
        disabled={nextDisabled}
        interactive={!nextDisabled}
        onClick={() => {
          if (!nextDisabled) {
            onNext();
          }
        }}
      />
      <ScheduleHeader.Today aria-label={SCHEDULE_LABELS_JA.today} onClick={onToday} />
      <BoardScheduleViewSelect onViewChange={onViewChange} scheduleView={scheduleView} />
    </ScheduleHeader>
  );
}
