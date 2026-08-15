import { Card, Stack, Text, Tooltip } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

type MonthDay = FunctionReturnType<typeof api.history.month>["days"][number];

type HistoryCalendarProps = {
  days: MonthDay[];
  month: Date;
  onOpenDate: (dateJst: string) => void;
  onMonthChange: (month: Date) => void;
};

export function HistoryCalendar({ days, month, onMonthChange, onOpenDate }: HistoryCalendarProps) {
  const byDate = new Map(days.map((day) => [day.dateJst, day]));

  return (
    <Card>
      <Calendar
        date={month}
        getDayProps={(date) => {
          const cell = byDate.get(date);
          return {
            bg: cell === undefined ? undefined : cell.isRest ? "yellow.1" : "cyan.1",
            onClick: () => onOpenDate(date),
          };
        }}
        onDateChange={(value) => {
          onMonthChange(new Date(`${value}T12:00:00+09:00`));
        }}
        renderDay={(date) => {
          const cell = byDate.get(date);
          const dayNumber = date.slice(8);
          if (cell === undefined) {
            return dayNumber;
          }
          const summary = cell.isRest ? "休養" : `${cell.minutes}分`;
          return (
            <Tooltip label={`移動平均 ${cell.movingAverage}分`}>
              <Stack gap={0} ta="center">
                <Text lh={1.2} size="sm">
                  {dayNumber}
                </Text>
                <Text c="dimmed" lh={1.2} size="xs">
                  {summary}
                </Text>
              </Stack>
            </Tooltip>
          );
        }}
        size="lg"
      />
    </Card>
  );
}
