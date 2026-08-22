import { ScheduleHeader, type ScheduleViewLevel } from "@mantine/schedule";
import dayjs from "dayjs";
import { addDaysJst, mondayOfWeek, type DateJst } from "~domain/jst";

import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

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
  const monthDateString = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;

  if (scheduleView === "day") {
    const nextDisabled = selectedDateJst >= todayJst;
    return (
      <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
        <ScheduleHeader.Previous
          aria-label={SCHEDULE_LABELS_JA.previous}
          onClick={() => onDateChange(addDaysJst(selectedDateJst, -1))}
        />
        <ScheduleHeader.MonthYearSelect
          monthValue={dayjs(selectedDateJst).month()}
          onMonthChange={(monthValue) => {
            const next = dayjs(selectedDateJst).month(monthValue);
            if (yearMonthOf(next.format("YYYY-MM-DD")) > yearMonthOf(todayJst)) {
              return;
            }
            onDateChange(next.format("YYYY-MM-DD"));
          }}
          onYearChange={(yearValue) => {
            const next = dayjs(selectedDateJst).year(yearValue);
            if (yearMonthOf(next.format("YYYY-MM-DD")) > yearMonthOf(todayJst)) {
              return;
            }
            onDateChange(next.format("YYYY-MM-DD"));
          }}
          popoverProps={{ withinPortal: true }}
          yearValue={dayjs(selectedDateJst).year()}
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
        <ScheduleHeader.ViewSelect onChange={onViewChange} value={scheduleView} />
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
        <ScheduleHeader.MonthYearSelect
          monthValue={dayjs(weekAnchor).month()}
          onMonthChange={(monthValue) => {
            const next = dayjs(weekAnchor).month(monthValue).startOf("month");
            if (yearMonthOf(next.format("YYYY-MM-DD")) > yearMonthOf(todayJst)) {
              return;
            }
            onWeekChange(mondayOfWeek(next.format("YYYY-MM-DD")));
          }}
          onYearChange={(yearValue) => {
            const next = dayjs(weekAnchor).year(yearValue).startOf("month");
            if (yearMonthOf(next.format("YYYY-MM-DD")) > yearMonthOf(todayJst)) {
              return;
            }
            onWeekChange(mondayOfWeek(next.format("YYYY-MM-DD")));
          }}
          popoverProps={{ withinPortal: true }}
          yearValue={dayjs(weekAnchor).year()}
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
        <ScheduleHeader.ViewSelect onChange={onViewChange} value={scheduleView} />
      </ScheduleHeader>
    );
  }

  if (scheduleView === "month") {
    const nextDisabled = yearMonthOf(monthDateString) >= yearMonthOf(todayJst);
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
            setDate(dayjs(monthDateString).add(-1, "month").startOf("month").format("YYYY-MM-DD"))
          }
        />
        <ScheduleHeader.MonthYearSelect
          monthValue={dayjs(monthDateString).month()}
          onMonthChange={(monthValue) => {
            setDate(dayjs(monthDateString).month(monthValue).startOf("month").format("YYYY-MM-DD"));
          }}
          onYearChange={(yearValue) => {
            setDate(dayjs(monthDateString).year(yearValue).startOf("month").format("YYYY-MM-DD"));
          }}
          popoverProps={{ withinPortal: true }}
          yearValue={dayjs(monthDateString).year()}
        />
        <ScheduleHeader.Next
          aria-label={SCHEDULE_LABELS_JA.next}
          disabled={nextDisabled}
          interactive={!nextDisabled}
          onClick={() => {
            if (!nextDisabled) {
              setDate(dayjs(monthDateString).add(1, "month").startOf("month").format("YYYY-MM-DD"));
            }
          }}
        />
        <ScheduleHeader.Today
          aria-label={SCHEDULE_LABELS_JA.today}
          onClick={() => onMonthChange(yearMonthOf(todayJst))}
        />
        <ScheduleHeader.ViewSelect onChange={onViewChange} value={scheduleView} />
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
      <ScheduleHeader.ViewSelect onChange={onViewChange} value={scheduleView} />
    </ScheduleHeader>
  );
}
