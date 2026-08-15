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
    <Calendar
      date={month}
      getDayProps={(date) => ({
        onClick: () => onOpenDate(date),
      })}
      onDateChange={(value) => {
        onMonthChange(new Date(`${value}T12:00:00+09:00`));
      }}
      renderDay={(date) => {
        const cell = byDate.get(date);
        const dayNumber = date.slice(8);
        if (cell === undefined) {
          return dayNumber;
        }
        return (
          <span>
            {dayNumber}
            {cell.isRest ? " 休養" : ` ${cell.minutes}分`}
            {` MA${cell.movingAverage}`}
          </span>
        );
      }}
    />
  );
}
