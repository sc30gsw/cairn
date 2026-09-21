import { DatePickerInput } from "@mantine/dates";
import { ScheduleHeader, getStartOfWeek, type ScheduleViewLevel } from "@mantine/schedule";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { mondayOfWeek, type DateJst } from "~domain/jst";

import { formatWeekNavigationLabel } from "~/features/plan/lib/board-schedule-navigation-labels";
import { planDatePickerProps } from "~/features/plan/lib/plan-date-picker-props";
import type { PlanScheduleView } from "~/features/plan/schemas/plan-search-schema";
import { calendarDayStyleClasses, calendarDayColor } from "~/lib/calendar-day-style";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";
import { cn } from "~/lib/utils";

import classes from "~/features/plan/components/board-schedule-navigation.module.css";

export type BoardScheduleNavigationProps = {
  monthDate: Date;
  onDateChange: (dateJst: DateJst) => void;
  onMonthChange: (yearMonth: string) => void;
  onMonthViewToday: () => void;
  onViewChange: (view: ScheduleViewLevel) => void;
  onWeekChange: (weekAnchor: DateJst) => void;
  scheduleView: PlanScheduleView;
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

function pickDateInWeek(
  value: string | null,
  onDateChange: (dateJst: DateJst) => void,
  onWeekChange: (weekAnchor: DateJst) => void,
) {
  if (typeof value !== "string") {
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
  value,
}: {
  ariaLabel: string;
  className?: string;
  label: string;
  onChange: (value: string | null) => void;
  value: DateJst;
}) {
  return (
    <ScheduleHeader.Control
      className={cn(classes.dateControl, className)}
      component="div"
      interactive={false}
    >
      <span
        className={classes.dateControlLabel}
        style={className === undefined ? { color: calendarDayColor(value) } : undefined}
      >
        {label}
      </span>
      <DatePickerInput
        aria-label={ariaLabel}
        className={classes.datePickerOverlay}
        classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
        onChange={onChange}
        value={value}
        {...planDatePickerProps()}
      />
    </ScheduleHeader.Control>
  );
}

export function BoardScheduleWeekPicker({
  onDateChange,
  onWeekChange,
  selectedDateJst,
  weekAnchor,
}: {
  onDateChange: (dateJst: DateJst) => void;
  onWeekChange: (weekAnchor: DateJst) => void;
  selectedDateJst: DateJst;
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
      onChange={(value) => pickDateInWeek(value, onDateChange, onWeekChange)}
      value={pickerValue}
    />
  );
}

export function BoardScheduleViewSelect({
  onViewChange,
  scheduleView,
}: {
  onViewChange: (view: ScheduleViewLevel) => void;
  scheduleView: PlanScheduleView;
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
  scheduleView: PlanScheduleView;
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
