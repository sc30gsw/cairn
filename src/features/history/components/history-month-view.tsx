import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { MonthView, ScheduleHeader, type DateStringValue } from "@mantine/schedule";
import type { FunctionReturnType } from "convex/server";
import dayjs from "dayjs";

import type { api } from "~/../convex/_generated/api";
import { HeatmapLegend } from "~/features/history/components/heatmap-legend";
import { HistoryLearningHeatmap } from "~/features/history/components/history-learning-heatmap";
import {
  monthEventMinutesById,
  toMonthScheduleEvents,
} from "~/features/history/lib/month-schedule-events";
import { SCHEDULE_LABELS_JA } from "~/features/history/lib/schedule-labels";
import { holidayName } from "~/lib/holiday";

type MonthDay = FunctionReturnType<typeof api.history.month>["days"][number];
type MonthEvent = FunctionReturnType<typeof api.history.monthBreakdown>["events"][number];

type HistoryMonthViewProps = {
  days: MonthDay[];
  events: MonthEvent[];
  month: Date;
  onDayClick: (dateJst: string) => void;
  onMonthChange: (month: Date) => void;
};

function toDateString(month: Date): DateStringValue {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
}

function toMonthDate(value: string): Date {
  return new Date(`${value}T12:00:00+09:00`);
}

export function HistoryMonthView({
  days,
  events,
  month,
  onDayClick,
  onMonthChange,
}: HistoryMonthViewProps) {
  const date = toDateString(month);
  const yearMonth = date.slice(0, 7);
  const scheduleEvents = toMonthScheduleEvents(events);
  const minutesByEventId = monthEventMinutesById(events);

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
            各日の学習内容と分数です。色は完了 / 未着手 / 見送りを表します。
          </Text>
          <MonthView
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
            maxEventsPerDay={10}
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
            1日の学習時間を GitHub の草のように表示します。記録がない日は休養です。
          </Text>
          <HistoryLearningHeatmap days={days} onDayClick={onDayClick} yearMonth={yearMonth} />
          <HeatmapLegend />
        </Stack>
      </Stack>
    </Card>
  );
}
