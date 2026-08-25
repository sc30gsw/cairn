import { Shimmer } from "@shimmer-from-structure/react";

import { HistoryMonthView } from "~/features/history/components/history-month-view";
import {
  historyShimmerHeatmapDays,
  historyShimmerMonthEvents,
} from "~/features/history/lib/history-shimmer-template";
import { useTodayJst } from "~/hooks/use-today-jst";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function HistoryMonthTabPending() {
  const today = useTodayJst();
  const month = new Date(`${today}T12:00:00+09:00`);

  return (
    <Shimmer loading>
      <HistoryMonthView
        days={historyShimmerHeatmapDays}
        events={historyShimmerMonthEvents}
        month={month}
        onDayClick={shimmerNoop}
        onMonthChange={shimmerNoop}
        todayJst={today}
      />
    </Shimmer>
  );
}
