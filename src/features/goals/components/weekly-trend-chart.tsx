import { BarChart } from "@mantine/charts";
import { Paper, Text } from "@mantine/core";

import {
  buildWeeklyTrendChartData,
  WEEKLY_TREND_CHART_SERIES,
  type WeeklyTrendChartPoint,
} from "~/features/goals/lib/weekly-trend-chart-data";
import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";

//? recharts はレイアウトのある環境でのみツールチップを描画する(happy-dom は非対応)。
//? そのためロジックを検証できるよう export し、コンポーネント単体テストの対象にする。
export function WeeklyTrendChartTooltip({
  point,
}: Record<"point", undefined | WeeklyTrendChartPoint>) {
  if (point === undefined) {
    return null;
  }

  return (
    <Paper px="md" py="sm" radius="md" shadow="md" withBorder>
      <Text fw={500} size="sm">
        {point.label}
      </Text>
      <Text size="sm">{point.qualifying}</Text>
      <Text c="dimmed" size="sm">
        {point.volumeMinutes}分
      </Text>
    </Paper>
  );
}

//? recharts の payload 型に依存せず、x 軸ラベルから自分の点を引く。
//? コンポーネント外のファクトリなので、レンダーごとに再定義されるコンポーネントにはならない。
export function weeklyTrendTooltipContent(
  pointByLabel: ReadonlyMap<string, WeeklyTrendChartPoint>,
) {
  return ({ label }: { label?: unknown }) => (
    <WeeklyTrendChartTooltip point={pointByLabel.get(String(label))} />
  );
}

export function WeeklyTrendChart({ weeks }: Record<"weeks", WeeklyTrendWeeks>) {
  const data = buildWeeklyTrendChartData(weeks);
  if (data.length === 0) {
    return null;
  }
  const pointByLabel = new Map(data.map((point) => [point.label, point]));

  return (
    <BarChart
      data={data}
      dataKey="label"
      h={140}
      maxBarWidth={28}
      series={WEEKLY_TREND_CHART_SERIES}
      tickLine="y"
      tooltipProps={{ content: weeklyTrendTooltipContent(pointByLabel) }}
      valueFormatter={(value) => `${value}分`}
      withLegend={false}
    />
  );
}
