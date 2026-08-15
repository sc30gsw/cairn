import { Heatmap } from "@mantine/charts";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import {
  buildHeatmapChartData,
  formatHeatmapTooltip,
  HEATMAP_CHART_COLORS,
  HEATMAP_DOMAIN,
  HEATMAP_MONTH_LABELS,
  HEATMAP_WEEKDAY_LABELS,
  monthHeatmapRange,
} from "~/features/history/lib/heatmap-colors";

type MonthDay = FunctionReturnType<typeof api.history.month>["days"][number];

type HistoryLearningHeatmapProps = {
  days: MonthDay[];
  onDayClick: (dateJst: string) => void;
  yearMonth: string;
};

export function HistoryLearningHeatmap({ days, onDayClick, yearMonth }: HistoryLearningHeatmapProps) {
  const byDate = new Map(days.map((day) => [day.dateJst, day]));
  const { endDate, startDate } = monthHeatmapRange(yearMonth);

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
      getTooltipLabel={({ date, value }) => formatHeatmapTooltip(date, value, byDate.get(date))}
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
