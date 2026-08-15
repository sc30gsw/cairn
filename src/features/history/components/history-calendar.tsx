import { Card, Stack, Text, Tooltip } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import type { FunctionReturnType } from "convex/server";
import { addDaysJst } from "~domain/jst";

import type { api } from "~/../convex/_generated/api";

type MonthDay = FunctionReturnType<typeof api.history.month>["days"][number];

type HistoryCalendarProps = {
  days: MonthDay[];
  month: Date;
  onOpenDate: (dateJst: string) => void;
  onMonthChange: (month: Date) => void;
};

function formatShortDateJst(dateJst: string): string {
  const [, month, day] = dateJst.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatDayAverage(minutes: number): string {
  return `${Math.round(minutes)}分`;
}

function movingAverageTooltip(dateJst: string, minutes: number): string {
  const start = formatShortDateJst(addDaysJst(dateJst, -6));
  const end = formatShortDateJst(dateJst);
  return `${start}〜${end} の1日平均: ${formatDayAverage(minutes)}（記録なし・休養は0分）`;
}

export function HistoryCalendar({ days, month, onMonthChange, onOpenDate }: HistoryCalendarProps) {
  const byDate = new Map(days.map((day) => [day.dateJst, day]));

  return (
    <Card>
      <Stack align="center" gap="sm">
        <Text c="dimmed" maw={360} size="sm" ta="center">
          各日の学習時間と、7日間の1日平均（均）。
          <br />
          記録がない日は0分として数えます。
        </Text>
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
            const average = formatDayAverage(cell.movingAverage);
            return (
              <Tooltip label={movingAverageTooltip(date, cell.movingAverage)}>
                <Stack gap={0} ta="center">
                  <Text lh={1.2} size="sm">
                    {dayNumber}
                  </Text>
                  <Text c="dimmed" lh={1.2} size="xs">
                    {summary}
                  </Text>
                  <Text c="dimmed" lh={1.2} size="xs">
                    均{average}
                  </Text>
                </Stack>
              </Tooltip>
            );
          }}
          size="lg"
          styles={{
            day: { minHeight: 64 },
            monthCell: { padding: 5 },
          }}
          w="fit-content"
          withCellSpacing
        />
      </Stack>
    </Card>
  );
}
