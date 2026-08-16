import type { DateJst } from "~domain/jst";

import { HistoryMonthView } from "~/features/history/components/history-month-view";
import { useHistoryMonthBreakdown } from "~/features/history/hooks/history-queries";
import { useHistoryView } from "~/features/history/hooks/use-history-view";

export function HistoryMonthTab() {
  const { monthDate, openDayAnalysis, setMonth, today, yearMonth } = useHistoryView();
  const { data: monthBreakdown } = useHistoryMonthBreakdown(today, yearMonth);

  return (
    <HistoryMonthView
      events={monthBreakdown.events}
      month={monthDate}
      onDayClick={(dateJst: DateJst) => {
        openDayAnalysis(dateJst);
      }}
      onMonthChange={(month) => {
        setMonth(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`);
      }}
      todayJst={today}
    />
  );
}
