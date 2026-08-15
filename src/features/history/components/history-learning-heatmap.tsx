import { Heatmap } from "@mantine/charts";
import { indexBy, prop } from "remeda";

import {
  buildHeatmapChartData,
  formatHeatmapTooltip,
  HEATMAP_CHART_COLORS,
  HEATMAP_DOMAIN,
  HEATMAP_MONTH_LABELS,
  HEATMAP_WEEKDAY_LABELS,
  yearHeatmapRange,
} from "~/features/history/lib/heatmap-colors";
import type { HeatmapDay } from "~/features/history/types/history";

type HistoryLearningHeatmapProps = {
  days: HeatmapDay[];
  onDayClick: (dateJst: string) => void;
  todayJst: string;
};

export function HistoryLearningHeatmap({ days, onDayClick, todayJst }: HistoryLearningHeatmapProps) {
  const byDate = indexBy(days, prop("dateJst"));
  const { endDate, startDate } = yearHeatmapRange(todayJst);

  return (
    <Heatmap
      colors={[...HEATMAP_CHART_COLORS]}
      data={buildHeatmapChartData(days)}
      domain={HEATMAP_DOMAIN}
      endDate={endDate}
      firstDayOfWeek={1}
      getRectProps={({ date }) => ({
        onClick: () => onDayClick(date),
        style: { cursor: "pointer" },
      })}
      getTooltipLabel={({ date, value }) => formatHeatmapTooltip(date, value, byDate[date])}
      monthLabels={[...HEATMAP_MONTH_LABELS]}
      rectRadius={2}
      rectSize={12}
      splitMonths
      startDate={startDate}
      weekdayLabels={[...HEATMAP_WEEKDAY_LABELS]}
      withMonthLabels
      withTooltip
      withWeekdayLabels
    />
  );
}
