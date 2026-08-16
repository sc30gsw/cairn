import { Shimmer } from "@shimmer-from-structure/react";
import { todayJst } from "~domain/jst";

import { HistoryMonthView } from "~/features/history/components/history-month-view";
import { historyShimmerMonthEvents } from "~/features/history/lib/history-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function HistoryMonthTabPending() {
  const today = todayJst();
  const month = new Date(`${today}T12:00:00+09:00`);

  return (
    <Shimmer loading>
      <HistoryMonthView
        events={historyShimmerMonthEvents}
        month={month}
        onDayClick={shimmerNoop}
        onMonthChange={shimmerNoop}
        todayJst={today}
      />
    </Shimmer>
  );
}
