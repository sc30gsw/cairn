import { Card, Stack, Text } from "@mantine/core";
import { MonthView } from "@mantine/schedule";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import { holidayName } from "~/lib/holiday";

type MonthDay = FunctionReturnType<typeof api.history.month>["days"][number];

type HistoryMonthViewProps = {
  days: MonthDay[];
  month: Date;
  onDayClick: (dateJst: string) => void;
  onMonthChange: (month: Date) => void;
};

function formatDayAverage(minutes: number): string {
  return `${Math.round(minutes)}分`;
}

function heatmapColor(minutes: number): string | undefined {
  if (minutes === 0) {
    return undefined;
  }
  if (minutes < 30) {
    return "var(--mantine-color-blue-1)";
  }
  if (minutes < 60) {
    return "var(--mantine-color-blue-2)";
  }
  if (minutes < 120) {
    return "var(--mantine-color-blue-3)";
  }
  return "var(--mantine-color-blue-4)";
}

export function HistoryMonthView({ days, month, onDayClick, onMonthChange }: HistoryMonthViewProps) {
  const byDate = new Map(days.map((day) => [day.dateJst, day]));
  const monthValue = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
  const events = days.map((day) => {
    const holiday = holidayName(day.dateJst);
    const average = formatDayAverage(day.movingAverage);
    const summary = day.isRest ? "休養" : `${day.minutes}分`;
    const title = holiday ? `${summary} / 均${average} / ${holiday}` : `${summary} / 均${average}`;
    return {
      allDay: true,
      end: `${day.dateJst} 23:59:59`,
      id: day.dateJst,
      start: `${day.dateJst} 00:00:00`,
      title,
    };
  });

  return (
    <Card>
      <Stack align="center" gap="sm">
        <Text c="dimmed" maw={420} size="sm" ta="center">
          各日の学習時間と、7日間の1日平均（均）。記録がない日は0分として数えます。
        </Text>
        <MonthView
          date={monthValue}
          events={events}
          getDayProps={(date) => {
            const cell = byDate.get(date);
            const holiday = holidayName(date);
            const rest = cell?.isRest ?? true;
            const bg = rest ? "var(--mantine-color-yellow-1)" : heatmapColor(cell?.minutes ?? 0);
            const borderLeft = holiday && !rest ? "3px solid var(--mantine-color-red-4)" : undefined;
            return {
              style: {
                backgroundColor: bg,
                borderLeft,
              },
            };
          }}
          maxEventsPerDay={1}
          onDateChange={(value) => onMonthChange(new Date(`${value}T12:00:00+09:00`))}
          onDayClick={(date) => onDayClick(date)}
          renderEventBody={(event) => {
            const dateJst = event.start.slice(0, 10);
            return (
              <Text c={holidayName(dateJst) ? "red.6" : "dimmed"} lineClamp={2} size="xs">
                {event.title}
              </Text>
            );
          }}
        />
      </Stack>
    </Card>
  );
}
