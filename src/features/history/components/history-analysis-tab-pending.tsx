import { Shimmer } from "@shimmer-from-structure/react";

import { HistoryAnalysisPanel } from "~/features/history/components/analysis/history-analysis-panel";
import {
  historyShimmerDayBreakdown,
  historyShimmerHeatmapDays,
  historyShimmerMonthBreakdown,
  historyShimmerSelectedDateJst,
  historyShimmerTodayJst,
  historyShimmerWeekBreakdown,
  historyShimmerYearMonth,
} from "~/features/history/lib/history-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function HistoryAnalysisTabPending() {
  return (
    <Shimmer loading>
      <HistoryAnalysisPanel
        day={historyShimmerDayBreakdown}
        heatmapDays={historyShimmerHeatmapDays}
        month={historyShimmerMonthBreakdown}
        onDayClick={shimmerNoop}
        onScopeChange={shimmerNoop}
        scope="month"
        selectedDateJst={historyShimmerSelectedDateJst}
        todayJst={historyShimmerTodayJst}
        week={historyShimmerWeekBreakdown}
        yearMonth={historyShimmerYearMonth}
      />
    </Shimmer>
  );
}
