import { Card } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

import { HistoryAnalysisPanel } from "~/features/history/components/analysis/history-analysis-panel";
import { PresetReviewPanel } from "~/features/history/components/analysis/preset-review-panel";
import {
  historyShimmerDayBreakdown,
  historyShimmerHeatmapDays,
  historyShimmerMonthBreakdown,
  historyShimmerPresetReview,
  historyShimmerSelectedDateJst,
  historyShimmerTodayJst,
  historyShimmerWeek,
  historyShimmerWeekBreakdown,
  historyShimmerYearMonth,
} from "~/features/history/lib/history-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function HistoryAnalysisTabPending() {
  return (
    <Shimmer loading>
      <Card mb="md" padding="md">
        <PresetReviewPanel review={historyShimmerPresetReview} />
      </Card>
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
        weekDays={historyShimmerWeek.days}
        yearMonth={historyShimmerYearMonth}
      />
    </Shimmer>
  );
}
