import { HistoryMonthView } from "~/features/history/components/history-month-view";
import { useHistoryMonthBreakdown } from "~/features/history/hooks/history-queries";

type HistoryMonthTabProps = {
  month: Date;
  onDayClick: (dateJst: string) => void;
  onMonthChange: (month: Date) => void;
  today: string;
  yearMonth: string;
};

export function HistoryMonthTab({
  month,
  onDayClick,
  onMonthChange,
  today,
  yearMonth,
}: HistoryMonthTabProps) {
  const { data: monthBreakdown } = useHistoryMonthBreakdown(today, yearMonth);

  return (
    <HistoryMonthView
      events={monthBreakdown.events}
      month={month}
      onDayClick={onDayClick}
      onMonthChange={onMonthChange}
      todayJst={today}
    />
  );
}
