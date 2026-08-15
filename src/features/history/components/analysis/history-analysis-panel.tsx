import { BarChart, DonutChart } from "@mantine/charts";
import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { WeeklyProgressCard } from "~/features/goals/components/weekly-progress-card";
import { BreakdownTable } from "~/features/history/components/breakdown-table";
import { HeatmapLegend } from "~/features/history/components/heatmap-legend";
import { buildDonutCells, buildWeekBarData } from "~/features/history/lib/chart-data";
import type { DayBreakdown, MonthBreakdown, WeekBreakdown } from "~/features/history/types/history";

type AnalysisScope = "day" | "month" | "week";

type HistoryAnalysisPanelProps = {
  day: DayBreakdown;
  month: MonthBreakdown;
  onScopeChange: (scope: AnalysisScope) => void;
  onSwitchToMonthTab: () => void;
  scope: AnalysisScope;
  selectedDateJst: string;
  todayJst: string;
  week: WeekBreakdown;
  yearMonth: string;
};

function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

function RestAlert() {
  return (
    <Alert color="yellow" title="休養">
      この日は記録がありません。
    </Alert>
  );
}

function EmptyConfirmedAlert() {
  return (
    <Alert color="blue" title="完了なし">
      完了した記録がありません。
    </Alert>
  );
}

function DonutSection({
  breakdown,
  title,
}: {
  breakdown: Pick<DayBreakdown, "byCategory" | "confirmedMinutes" | "isRest" | "skippedMinutes">;
  title: string;
}) {
  if (breakdown.isRest) {
    return <RestAlert />;
  }
  if (breakdown.confirmedMinutes === 0 && breakdown.skippedMinutes === 0) {
    return <EmptyConfirmedAlert />;
  }
  const data = buildDonutCells(breakdown.byCategory, breakdown.skippedMinutes);
  if (data.length === 0) {
    return <EmptyConfirmedAlert />;
  }
  return (
    <Card aria-labelledby={`${title}-donut`} padding="md">
      <Title id={`${title}-donut`} order={3}>
        {title}
      </Title>
      <Stack align="center" gap="sm" mt="sm">
        <DonutChart
          chartLabel={`${breakdown.confirmedMinutes}分`}
          data={data}
          size={200}
          strokeColor="var(--mantine-color-body)"
          styles={{ root: { marginInline: "auto" } }}
          thickness={24}
          tooltipDataSource="segment"
          valueFormatter={(value) => `${value}分`}
          withLegend
        />
      </Stack>
    </Card>
  );
}

export function HistoryAnalysisPanel({
  day,
  month,
  onScopeChange,
  onSwitchToMonthTab,
  scope,
  selectedDateJst,
  todayJst,
  week,
  yearMonth,
}: HistoryAnalysisPanelProps) {
  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <SegmentedControl
          data={[
            { label: "日", value: "day" },
            { label: "週", value: "week" },
            { label: "月", value: "month" },
          ]}
          onChange={(value) => onScopeChange(value as AnalysisScope)}
          value={scope}
        />
        <Text c="dimmed" size="sm">
          {scope === "day" && selectedDateJst}
          {scope === "week" && `${week.weekStart} 〜 ${week.weekEnd}`}
          {scope === "month" && formatYearMonth(yearMonth)}
        </Text>
      </Group>

      {scope === "week" ? (
        <WeeklyProgressCard
          todayJst={todayJst}
          volumeMinutes={week.volumeMinutes}
          weekEndJst={week.weekEnd}
          weeklyGoalMinutes={week.weeklyGoalMinutes}
        />
      ) : null}

      {scope === "month" ? (
        <Stack gap="xs">
          <Text size="sm">
            完了 {month.confirmedMinutes}分 / 見送り {month.skippedMinutes}分
          </Text>
          <HeatmapLegend />
          <Button onClick={onSwitchToMonthTab} size="compact-sm" variant="light">
            月タブでヒートマップを見る
          </Button>
        </Stack>
      ) : null}

      <Grid>
        {scope === "week" ? (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card aria-labelledby="week-bar" padding="md">
              <Title id="week-bar" order={3}>
                日別ペース
              </Title>
              <BarChart
                data={buildWeekBarData(week.byDay)}
                dataKey="label"
                h={220}
                series={[{ color: "blue.6", name: "完了" }]}
                tickLine="y"
                valueFormatter={(value) => `${value}分`}
                withLegend={false}
              />
            </Card>
          </Grid.Col>
        ) : null}
        <Grid.Col span={{ base: 12, md: scope === "week" ? 6 : 12 }}>
          <DonutSection
            breakdown={
              scope === "day"
                ? day
                : scope === "week"
                  ? week
                  : { ...month, isRest: false, skippedMinutes: month.skippedMinutes }
            }
            title={scope === "day" ? "日次内訳" : scope === "week" ? "週次内訳" : "月次内訳"}
          />
        </Grid.Col>
      </Grid>

      <BreakdownTable
        confirmedMinutes={
          scope === "day"
            ? day.confirmedMinutes
            : scope === "week"
              ? week.confirmedMinutes
              : month.confirmedMinutes
        }
        rows={scope === "day" ? day.rows : scope === "week" ? week.rows : month.rows}
      />

      {scope === "day" && !day.isRest ? (
        <Button component={Link} params={{ dateJst: selectedDateJst }} to="/days/$dateJst">
          この日を開く
        </Button>
      ) : null}
    </Stack>
  );
}
