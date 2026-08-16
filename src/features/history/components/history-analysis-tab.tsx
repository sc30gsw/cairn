import { Card } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { HistoryAnalysisPanel } from "~/features/history/components/analysis/history-analysis-panel";
import {
  useHistoryDayBreakdown,
  useHistoryMonthBreakdown,
  useHistoryWeekBreakdown,
  useHistoryYearHeatmap,
} from "~/features/history/hooks/history-queries";
import type { AnalysisScope } from "~/features/history/schemas/analysis-scope-schema";

type HistoryAnalysisTabProps = {
  analysisScope: AnalysisScope;
  onDayClick: (dateJst: string) => void;
  onScopeChange: (scope: AnalysisScope) => void;
  selectedDateJst: string;
  today: string;
  weekAnchor: string;
  yearMonth: string;
};

export function HistoryAnalysisTab({
  analysisScope,
  onDayClick,
  onScopeChange,
  selectedDateJst,
  today,
  weekAnchor,
  yearMonth,
}: HistoryAnalysisTabProps) {
  const { data: monthBreakdown } = useHistoryMonthBreakdown(today, yearMonth);
  const { data: yearHeatmap } = useHistoryYearHeatmap(today);
  const { data: weekBreakdown } = useHistoryWeekBreakdown(weekAnchor);
  const { data: dayBreakdown } = useHistoryDayBreakdown(selectedDateJst);

  return (
    <>
      <Card>
        <HistoryAnalysisPanel
          day={dayBreakdown}
          heatmapDays={yearHeatmap.days}
          month={monthBreakdown}
          onDayClick={onDayClick}
          onScopeChange={onScopeChange}
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
          className="text-blue-400 hover:underline"
        >
          選択中の日 ({selectedDateJst}) を編集
        </Link>
      </Card>
    </>
  );
}
