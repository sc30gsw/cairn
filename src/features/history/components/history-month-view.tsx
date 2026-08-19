import { Card, Group, Stack, Text, Title } from "@mantine/core";
import {
  MonthView,
  ScheduleHeader,
  type DateStringValue,
  type ScheduleEventData,
} from "@mantine/schedule";
import { cn } from "cnfast";
import dayjs from "dayjs";
import type { DateJst } from "~domain/jst";
import { isFutureDateJst } from "~domain/jst";

import {
  confirmedMonthEvents,
  monthEventMinutesById,
  scheduleEventDateJst,
  toMonthScheduleEvents,
} from "~/features/history/lib/month-schedule-events";
import { SCHEDULE_LABELS_JA } from "~/features/history/lib/schedule-labels";
import type { MonthEvent } from "~/features/history/types/history";
import {
  calendarDayProps,
  calendarDayStyleClasses,
  historyCalendarDayProps,
} from "~/lib/calendar-day-style";

import classes from "~/features/history/components/history-month-view.module.css";

type HistoryMonthViewProps = {
  events: MonthEvent[];
  month: Date;
  onDayClick: (dateJst: DateJst) => void;
  onMonthChange: (month: Date) => void;
  todayJst?: DateJst;
};

function toDateString(month: Date): DateStringValue {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
}

function toMonthDate(value: string): Date {
  return new Date(`${value}T12:00:00+09:00`);
}

function yearMonthOf(value: string): string {
  return value.slice(0, 7);
}

export function HistoryMonthView({
  events,
  month,
  onDayClick,
  onMonthChange,
  todayJst,
}: HistoryMonthViewProps) {
  const date = toDateString(month);
  const confirmedEvents = confirmedMonthEvents(events);
  const scheduleEvents = toMonthScheduleEvents(confirmedEvents);
  const minutesByEventId = monthEventMinutesById(confirmedEvents);
  const nextDisabled = todayJst !== undefined && yearMonthOf(date) >= yearMonthOf(todayJst);

  const setDate = (value: string) => {
    if (todayJst !== undefined && yearMonthOf(value) > yearMonthOf(todayJst)) {
      return;
    }
    onMonthChange(toMonthDate(value));
  };

  const shiftMonth = (offset: number) => {
    setDate(dayjs(date).add(offset, "month").startOf("month").format("YYYY-MM-DD"));
  };

  const handleDayClick = (day: DateStringValue) => {
    if (todayJst !== undefined && isFutureDateJst(day, todayJst)) {
      return;
    }
    onDayClick(day);
  };

  const handleEventClick = (event: ScheduleEventData) => {
    handleDayClick(scheduleEventDateJst(event));
  };

  return (
    <Card padding="md">
      <Stack gap="sm">
        <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
          <ScheduleHeader.Previous
            aria-label={SCHEDULE_LABELS_JA.previous}
            onClick={() => shiftMonth(-1)}
          />
          <ScheduleHeader.MonthYearSelect
            monthValue={dayjs(date).month()}
            onMonthChange={(monthValue) => {
              setDate(dayjs(date).month(monthValue).startOf("month").format("YYYY-MM-DD"));
            }}
            onYearChange={(yearValue) => {
              setDate(dayjs(date).year(yearValue).startOf("month").format("YYYY-MM-DD"));
            }}
            popoverProps={{ withinPortal: true }}
            yearValue={dayjs(date).year()}
          />
          <ScheduleHeader.Next
            aria-label={SCHEDULE_LABELS_JA.next}
            disabled={nextDisabled}
            interactive={!nextDisabled}
            onClick={() => {
              if (!nextDisabled) {
                shiftMonth(1);
              }
            }}
          />
          <ScheduleHeader.Today
            aria-label={SCHEDULE_LABELS_JA.today}
            onClick={() => setDate(dayjs().format("YYYY-MM-DD"))}
          />
        </ScheduleHeader>

        <Stack gap="xs">
          <Title order={4}>記録</Title>
          <Text c="dimmed" size="xs">
            確定した学習内容と分数です。2件を超える日は「+N件」で省略します。
          </Text>
          <MonthView
            className={cn(classes.compactMonthView, calendarDayStyleClasses.japaneseCalendar)}
            consistentWeeks={false}
            date={date}
            events={scheduleEvents}
            firstDayOfWeek={1}
            getDayProps={(day) =>
              todayJst === undefined
                ? calendarDayProps(day)
                : historyCalendarDayProps(day, todayJst)
            }
            labels={SCHEDULE_LABELS_JA}
            locale="ja"
            maxEventsPerDay={2}
            moreEventsProps={{
              dropdownType: "modal",
              modalProps: { centered: true },
              modalTitle: "この日の記録",
              mode: "static",
            }}
            onDateChange={setDate}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            renderEventBody={(event) => {
              const minutes = minutesByEventId.get(String(event.id));
              return (
                <Group gap={4} wrap="nowrap">
                  <Text fw={600} lineClamp={1} size="xs">
                    {event.title}
                  </Text>
                  {minutes !== undefined ? (
                    <Text c="blue.7" fw={600} size="xs">
                      {minutes}分
                    </Text>
                  ) : null}
                </Group>
              );
            }}
            scrollAreaProps={{ type: "never" }}
            withHeader={false}
          />
        </Stack>
      </Stack>
    </Card>
  );
}
