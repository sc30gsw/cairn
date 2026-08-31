import { Anchor, Card } from "@mantine/core";
import { useSuspenseQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { HistoryAnalysisPanel } from "~/features/history/components/analysis/history-analysis-panel";
import { PresetReviewPanel } from "~/features/history/components/analysis/preset-review-panel";
import {
  historyDayBreakdownQuery,
  historyMonthBreakdownQuery,
  historyPresetReviewQuery,
  historyWeekBreakdownQuery,
  historyWeekQuery,
  historyYearHeatmapQuery,
} from "~/features/history/hooks/history-queries";
import { useHistoryView } from "~/features/history/hooks/use-history-view";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";

export function HistoryAnalysisTab() {
  const {
    analysisScope,
    openDayAnalysis,
    selectedDateJst,
    setScope,
    today,
    weekAnchor,
    yearMonth,
  } = useHistoryView();

  const [
    { data: monthBreakdown },
    { data: yearHeatmap },
    { data: weekPage },
    { data: weekBreakdown },
    { data: dayBreakdown },
    { data: presetReview },
  ] = useSuspenseQueries({
    queries: [
      parallelConvexQuery(historyMonthBreakdownQuery(today, yearMonth)),
      parallelConvexQuery(historyYearHeatmapQuery(today)),
      parallelConvexQuery(historyWeekQuery(weekAnchor, today)),
      parallelConvexQuery(historyWeekBreakdownQuery(weekAnchor, today)),
      parallelConvexQuery(historyDayBreakdownQuery(selectedDateJst, today)),
      parallelConvexQuery(historyPresetReviewQuery(today)),
    ],
  });

  return (
    <>
      <Card mb="md" padding="md">
        <PresetReviewPanel review={presetReview} />
      </Card>
      <Card>
        <HistoryAnalysisPanel
          day={dayBreakdown}
          heatmapDays={yearHeatmap.days}
          month={monthBreakdown}
          onDayClick={openDayAnalysis}
          onScopeChange={setScope}
          scope={analysisScope}
          selectedDateJst={selectedDateJst}
          todayJst={today}
          week={weekBreakdown}
          weekDays={weekPage.days}
          yearMonth={yearMonth}
        />
      </Card>
      <Card mt="md" padding="md" ta="center">
        <Anchor
          renderRoot={(props) => (
            <Link {...props} params={{ dateJst: selectedDateJst }} to="/days/$dateJst" />
          )}
        >
          選択中の日 ({selectedDateJst}) を編集
        </Anchor>
      </Card>
    </>
  );
}
