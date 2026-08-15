import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { MonthView, ScheduleHeader, type DateStringValue } from "@mantine/schedule";
import dayjs from "dayjs";

import { HeatmapLegend } from "~/features/history/components/heatmap-legend";
import { HistoryLearningHeatmap } from "~/features/history/components/history-learning-heatmap";
import classes from "~/features/history/components/history-month-view.module.css";
import {
  confirmedMonthEvents,
  monthEventMinutesById,
  toMonthScheduleEvents,
} from "~/features/history/lib/month-schedule-events";
import { SCHEDULE_LABELS_JA } from "~/features/history/lib/schedule-labels";
import type { MonthEvent, YearHeatmapDay } from "~/features/history/types/history";
import { holidayName } from "~/lib/holiday";

type HistoryMonthViewProps = {
  events: MonthEvent[];
  heatmapDays: YearHeatmapDay[];
  month: Date;
  onDayClick: (dateJst: string) => void;
  onMonthChange: (month: Date) => void;
  todayJst: string;
};

function toDateString(month: Date): DateStringValue {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
}

function toMonthDate(value: string): Date {
  return new Date(`${value}T12:00:00+09:00`);
}

export function HistoryMonthView({
  events,
  heatmapDays,
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

  return (
    <Card>
      <Stack gap="lg">
        <ScheduleHeader labels={SCHEDULE_LABELS_JA}>
          <ScheduleHeader.Previous aria-label={SCHEDULE_LABELS_JA.previous} onClick={() => shiftMonth(-1)} />
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

        <Stack gap="sm">
          <Title order={3}>記録</Title>
          <Text c="dimmed" size="sm">
            確定した学習内容と分数です。
          </Text>
          <MonthView
            className={classes.compactMonthView}
            consistentWeeks={false}
            date={date}
            events={scheduleEvents}
            getDayProps={(day) => {
              const holiday = holidayName(day);
              return holiday
                ? {
                    style: { borderLeft: "3px solid var(--mantine-color-red-4)" },
                    title: holiday,
                  }
                : {};
            }}
            labels={SCHEDULE_LABELS_JA}
            locale="ja"
            maxEventsPerDay={3}
            onDateChange={setDate}
            onDayClick={(day) => onDayClick(day)}
            renderEventBody={(event) => {
              const minutes = minutesByEventId.get(String(event.id));
              return (
                <Group gap={4} wrap="nowrap">
                  <Text lineClamp={1} size="xs">
                    {event.title}
                  </Text>
                  {minutes !== undefined ? (
                    <Text c="dimmed" size="xs">
                      {minutes}分
                    </Text>
                  ) : null}
                </Group>
              );
            }}
            withHeader={false}
          />
        </Stack>

        <Stack gap="sm">
          <Title order={3}>学習量</Title>
          <Text c="dimmed" size="sm">
            直近365日の学習時間を GitHub の草のように表示します。記録がない日は休養です。
          </Text>
          <HistoryLearningHeatmap days={heatmapDays} onDayClick={onDayClick} todayJst={todayJst} />
          <HeatmapLegend />
        </Stack>
      </Stack>
    </Card>
  );
}
