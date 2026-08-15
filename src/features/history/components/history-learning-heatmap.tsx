import { Heatmap } from "@mantine/charts";
import { indexBy, prop } from "remeda";

import classes from "~/features/history/components/history-learning-heatmap.module.css";
import {
  buildHeatmapChartData,
  formatHeatmapTooltip,
  HEATMAP_CHART_COLORS,
  HEATMAP_DOMAIN,
  HEATMAP_MONTH_LABELS,
  HEATMAP_WEEKDAY_LABELS,
  isRestHeatmapDay,
  REST_HEATMAP_FILL,
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
      classNames={{ root: classes.root }}
      colors={[...HEATMAP_CHART_COLORS]}
      data={buildHeatmapChartData(days)}
      domain={HEATMAP_DOMAIN}
      endDate={endDate}
      firstDayOfWeek={1}
      gap={2}
      getRectProps={({ date, value }) => {
        const day = byDate[date];
        const isRest = isRestHeatmapDay(day) || value === null || value === 0;
        return {
          fill: isRest ? REST_HEATMAP_FILL : undefined,
          onClick: () => onDayClick(date),
          style: { cursor: "pointer" },
        };
      }}
      getTooltipLabel={({ date, value }) => formatHeatmapTooltip(date, value, byDate[date])}
      monthLabels={[...HEATMAP_MONTH_LABELS]}
      monthLabelsPosition="bottom"
      rectRadius={2}
      rectSize={11}
      startDate={startDate}
      weekdayLabels={[...HEATMAP_WEEKDAY_LABELS]}
      withMonthLabels
      withTooltip
      withWeekdayLabels
    />
  );
}
