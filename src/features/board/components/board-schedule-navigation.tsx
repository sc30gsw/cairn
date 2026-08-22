import { DatePickerInput } from "@mantine/dates";
import { ScheduleHeader, getStartOfWeek, type ScheduleViewLevel } from "@mantine/schedule";
import dayjs from "dayjs";
import { addDaysJst, isFutureDateJst, mondayOfWeek, type DateJst } from "~domain/jst";

import {
  DAY_NAVIGATION_DATE_FORMAT,
  formatWeekNavigationLabel,
} from "~/features/board/lib/board-schedule-navigation-labels";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";
import { calendarDayProps, calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

import classes from "~/features/board/components/board-schedule-navigation.module.css";

type BoardScheduleNavigationProps = {
  monthDate: Date;
  onDateChange: (dateJst: DateJst) => void;
  onMonthChange: (yearMonth: string) => void;
  onViewChange: (view: ScheduleViewLevel) => void;
  onWeekChange: (weekAnchor: DateJst) => void;
  scheduleView: BoardScheduleView;
  selectedDateJst: DateJst;
  todayJst: DateJst;
  weekAnchor: DateJst;
};

function yearMonthOf(value: string): string {
  return value.slice(0, 7);
}

function monthDateString(monthDate: Date): string {
  return `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;
}

function sharedDatePickerProps(todayJst: DateJst) {
  return {
    firstDayOfWeek: 1 as const,
    getDayProps: (date: string) => calendarDayProps(date, todayJst),
    getMonthControlProps: (month: string) => ({
      disabled: month.slice(0, 7) > todayJst.slice(0, 7),
    }),
    getYearControlProps: (year: string) => ({
      disabled: year.slice(0, 4) > todayJst.slice(0, 4),
    }),
    locale: "ja",
    maxDate: todayJst,
    popoverProps: { withinPortal: true },
  };
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

function BoardScheduleDatePicker({
  onChange,
  todayJst,
  value,
  valueFormat,
}: {
  onChange: (value: string | null) => void;
  todayJst: DateJst;
  value: DateJst;
  valueFormat: string;
}) {
  return (
    <DatePickerInput
      aria-label="日付を選択"
      className={classes.navigationDateInput}
      classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
      onChange={onChange}
      value={value}
      valueFormat={valueFormat}
      {...sharedDatePickerProps(todayJst)}
    />
  );
}

function BoardScheduleWeekPicker({
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
    <>
      <ScheduleHeader.Control className={classes.weekRangeLabel} interactive={false}>
        {formatWeekNavigationLabel(weekAnchor)}
      </ScheduleHeader.Control>
      <DatePickerInput
        aria-label="週を選択"
        className={classes.weekDateInput}
        classNames={{ month: calendarDayStyleClasses.japaneseCalendar }}
        onChange={(value) => pickDateInWeek(value, todayJst, onDateChange, onWeekChange)}
        value={pickerValue}
        valueFormat="M/D"
        {...sharedDatePickerProps(todayJst)}
      />
    </>
  );
}

function BoardScheduleViewSelect({
  onViewChange,
  scheduleView,
}: {
  onViewChange: (view: ScheduleViewLevel) => void;
  scheduleView: BoardScheduleView;
}) {
  return <ScheduleHeader.ViewSelect onChange={onViewChange} value={scheduleView} />;
}

export function BoardScheduleNavigation({
  monthDate,
  onDateChange,
  onMonthChange,
  onViewChange,
  onWeekChange,
  scheduleView,
  selectedDateJst,
  todayJst,
  weekAnchor,
}: BoardScheduleNavigationProps) {
  const monthAnchor = monthDateString(monthDate);

  if (scheduleView === "day") {
    const nextDisabled = selectedDateJst >= todayJst;
    return (
      <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
        <ScheduleHeader.Previous
          aria-label={SCHEDULE_LABELS_JA.previous}
          onClick={() => onDateChange(addDaysJst(selectedDateJst, -1))}
        />
        <BoardScheduleDatePicker
          onChange={(value) => {
            if (typeof value === "string" && !isFutureDateJst(value, todayJst)) {
              onDateChange(value);
            }
          }}
          todayJst={todayJst}
          value={selectedDateJst}
          valueFormat={DAY_NAVIGATION_DATE_FORMAT}
        />
        <ScheduleHeader.Next
          aria-label={SCHEDULE_LABELS_JA.next}
          disabled={nextDisabled}
          interactive={!nextDisabled}
          onClick={() => {
            if (!nextDisabled) {
              onDateChange(addDaysJst(selectedDateJst, 1));
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

  if (scheduleView === "week") {
    const nextWeek = addDaysJst(weekAnchor, 7);
    const nextDisabled = nextWeek > todayJst;
    return (
      <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
        <ScheduleHeader.Previous
          aria-label={SCHEDULE_LABELS_JA.previous}
          onClick={() => onWeekChange(addDaysJst(weekAnchor, -7))}
        />
        <BoardScheduleWeekPicker
          onDateChange={onDateChange}
          onWeekChange={onWeekChange}
          selectedDateJst={selectedDateJst}
          todayJst={todayJst}
          weekAnchor={weekAnchor}
        />
        <ScheduleHeader.Next
          aria-label={SCHEDULE_LABELS_JA.next}
          disabled={nextDisabled}
          interactive={!nextDisabled}
          onClick={() => {
            if (!nextDisabled) {
              onWeekChange(nextWeek);
            }
          }}
        />
        <ScheduleHeader.Today
          aria-label={SCHEDULE_LABELS_JA.today}
          onClick={() => onWeekChange(mondayOfWeek(todayJst))}
        />
        <BoardScheduleViewSelect onViewChange={onViewChange} scheduleView={scheduleView} />
      </ScheduleHeader>
    );
  }

  if (scheduleView === "month") {
    const nextDisabled = yearMonthOf(monthAnchor) >= yearMonthOf(todayJst);
    const setDate = (value: string) => {
      if (yearMonthOf(value) > yearMonthOf(todayJst)) {
        return;
      }
      onMonthChange(yearMonthOf(value));
    };

    return (
      <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
        <ScheduleHeader.Previous
          aria-label={SCHEDULE_LABELS_JA.previous}
          onClick={() =>
            setDate(dayjs(monthAnchor).add(-1, "month").startOf("month").format("YYYY-MM-DD"))
          }
        />
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
        <ScheduleHeader.Next
          aria-label={SCHEDULE_LABELS_JA.next}
          disabled={nextDisabled}
          interactive={!nextDisabled}
          onClick={() => {
            if (!nextDisabled) {
              setDate(dayjs(monthAnchor).add(1, "month").startOf("month").format("YYYY-MM-DD"));
            }
          }}
        />
        <ScheduleHeader.Today
          aria-label={SCHEDULE_LABELS_JA.today}
          onClick={() => onMonthChange(yearMonthOf(todayJst))}
        />
        <BoardScheduleViewSelect onViewChange={onViewChange} scheduleView={scheduleView} />
      </ScheduleHeader>
    );
  }

  const nextYearStart = `${Number(selectedDateJst.slice(0, 4)) + 1}-01-01`;
  const nextDisabled = nextYearStart > todayJst;

  return (
    <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
      <ScheduleHeader.Previous
        aria-label={SCHEDULE_LABELS_JA.previous}
        onClick={() => onDateChange(`${Number(selectedDateJst.slice(0, 4)) - 1}-01-01` as DateJst)}
      />
      <ScheduleHeader.MonthYearSelect
        monthValue={0}
        onMonthChange={() => undefined}
        onYearChange={(yearValue) => {
          const next = `${yearValue}-01-01`;
          if (yearMonthOf(next) > yearMonthOf(todayJst)) {
            return;
          }
          onDateChange(next as DateJst);
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
            onDateChange(nextYearStart as DateJst);
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
