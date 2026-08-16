import { BarChart } from "@mantine/charts";

import {
  buildWeeklyTrendChartData,
  weeklyTrendGoalReferenceLine,
  WEEKLY_TREND_CHART_SERIES,
} from "~/features/goals/lib/weekly-trend-chart-data";
import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

export function WeeklyTrendChart({ weeks }: Record<"weeks", WeeklyTrendWeeks>) {
  const data = buildWeeklyTrendChartData(weeks);
  if (data.length === 0) {
    return null;
  }
  const referenceGoalMinutes = weeklyTrendGoalReferenceLine(weeks);

  return (
    <BarChart
      data={data}
      dataKey="label"
      h={140}
      maxBarWidth={28}
      referenceLines={
        referenceGoalMinutes === null
          ? undefined
          : [
              {
                color: "gray.6",
                label: `目安 ${referenceGoalMinutes}分`,
                y: referenceGoalMinutes,
              },
            ]
      }
      series={WEEKLY_TREND_CHART_SERIES}
      tickLine="y"
      valueFormatter={(value) => `${value}分`}
      withLegend={false}
    />
  );
}
