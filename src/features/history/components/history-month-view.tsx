import { Card, Group, Stack, Text, Title } from "@mantine/core";
import {
  MonthView,
  ScheduleHeader,
  type DateStringValue,
  type ScheduleEventData,
} from "@mantine/schedule";
import dayjs from "dayjs";
import type { DateJst } from "~domain/jst";

import {
  confirmedMonthEvents,
  monthEventMinutesById,
  scheduleEventDateJst,
  toMonthScheduleEvents,
} from "~/features/history/lib/month-schedule-events";
import { SCHEDULE_LABELS_JA } from "~/features/history/lib/schedule-labels";
import type { MonthEvent } from "~/features/history/types/history";
import { holidayName } from "~/lib/holiday";

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

function dayCellClassName(day: DateJst, todayJst?: DateJst): string | undefined {
  if (todayJst !== undefined && day === todayJst) {
    return undefined;
  }
  if (holidayName(day)) {
    return classes.holidayDay;
  }
  const weekday = dayjs(day).day();
  if (weekday === 0) {
    return classes.sundayDay;
  }
  if (weekday === 6) {
    return classes.saturdayDay;
  }
  return undefined;
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

  const setDate = (value: string) => {
    onMonthChange(toMonthDate(value));
  };

  const shiftMonth = (offset: number) => {
    setDate(dayjs(date).add(offset, "month").startOf("month").format("YYYY-MM-DD"));
  };

  const handleEventClick = (event: ScheduleEventData) => {
    onDayClick(scheduleEventDateJst(event));
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
          <ScheduleHeader.Next aria-label={SCHEDULE_LABELS_JA.next} onClick={() => shiftMonth(1)} />
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
            className={classes.compactMonthView}
            consistentWeeks={false}
            date={date}
            events={scheduleEvents}
            firstDayOfWeek={1}
            getDayProps={(day) => {
              const holiday = holidayName(day);
              const className = dayCellClassName(day, todayJst);
              return {
                ...(className ? { className } : {}),
                ...(holiday ? { title: holiday } : {}),
              };
            }}
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
            onDayClick={(day) => onDayClick(day)}
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
