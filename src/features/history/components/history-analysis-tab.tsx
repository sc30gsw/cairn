import { Card } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { HistoryAnalysisPanel } from "~/features/history/components/analysis/history-analysis-panel";
import { PresetReviewPanel } from "~/features/history/components/analysis/preset-review-panel";
import {
  useHistoryDayBreakdown,
  useHistoryMonthBreakdown,
  useHistoryPresetReview,
  useHistoryWeekBreakdown,
  useHistoryYearHeatmap,
} from "~/features/history/hooks/history-queries";
import { useHistoryView } from "~/features/history/hooks/use-history-view";

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
  const { data: monthBreakdown } = useHistoryMonthBreakdown(today, yearMonth);
  const { data: yearHeatmap } = useHistoryYearHeatmap(today);
  const { data: weekBreakdown } = useHistoryWeekBreakdown(weekAnchor, today);
  const { data: dayBreakdown } = useHistoryDayBreakdown(selectedDateJst, today);
  const { data: presetReview } = useHistoryPresetReview(today);

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
          yearMonth={yearMonth}
        />
      </Card>
      <Card mt="md" padding="md" className="text-center">
        <Link
          params={{ dateJst: selectedDateJst }}
          to="/days/$dateJst"
          className="text-primary-6 hover:underline"
        >
          選択中の日 ({selectedDateJst}) を編集
        </Link>
      </Card>
    </>
  );
}
