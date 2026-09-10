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
import {
  useOptionalHistoryDayBreakdownLiveQuery,
  useOptionalHistoryMonthBreakdownLiveQuery,
  useOptionalHistoryPresetReviewLiveQuery,
  useOptionalHistoryWeekBreakdownLiveQuery,
  useOptionalHistoryWeekLiveQuery,
  useOptionalHistoryYearHeatmapLiveQuery,
} from "~/lib/tanstack-db/collections";

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

  const liveMonthBreakdown = useOptionalHistoryMonthBreakdownLiveQuery({
    todayJst: today,
    yearMonth,
  });
  const liveYearHeatmap = useOptionalHistoryYearHeatmapLiveQuery({ todayJst: today });
  const liveWeekPage = useOptionalHistoryWeekLiveQuery({ dateJst: weekAnchor, todayJst: today });
  const liveWeekBreakdown = useOptionalHistoryWeekBreakdownLiveQuery({
    dateJst: weekAnchor,
    todayJst: today,
  });
  const liveDayBreakdown = useOptionalHistoryDayBreakdownLiveQuery({
    dateJst: selectedDateJst,
    todayJst: today,
  });
  const livePresetReview = useOptionalHistoryPresetReviewLiveQuery({ todayJst: today });
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
  const selectedMonthBreakdown =
    liveMonthBreakdown.isReady && liveMonthBreakdown.data !== undefined
      ? liveMonthBreakdown.data
      : monthBreakdown;
  const selectedYearHeatmap =
    liveYearHeatmap.isReady && liveYearHeatmap.data !== undefined
      ? liveYearHeatmap.data
      : yearHeatmap;
  const selectedWeekPage =
    liveWeekPage.isReady && liveWeekPage.data !== undefined ? liveWeekPage.data : weekPage;
  const selectedWeekBreakdown =
    liveWeekBreakdown.isReady && liveWeekBreakdown.data !== undefined
      ? liveWeekBreakdown.data
      : weekBreakdown;
  const selectedDayBreakdown =
    liveDayBreakdown.isReady && liveDayBreakdown.data !== undefined
      ? liveDayBreakdown.data
      : dayBreakdown;
  const selectedPresetReview =
    livePresetReview.isReady && livePresetReview.data !== undefined
      ? livePresetReview.data
      : presetReview;

  return (
    <>
      <Card mb="md" padding="md">
        <PresetReviewPanel review={selectedPresetReview} />
      </Card>
      <Card>
        <HistoryAnalysisPanel
          day={selectedDayBreakdown}
          heatmapDays={selectedYearHeatmap.days}
          month={selectedMonthBreakdown}
          onDayClick={openDayAnalysis}
          onScopeChange={setScope}
          scope={analysisScope}
          selectedDateJst={selectedDateJst}
          todayJst={today}
          week={selectedWeekBreakdown}
          weekDays={selectedWeekPage.days}
          weekEvents={selectedWeekPage.events}
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
