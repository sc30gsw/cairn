import { CompositeChart, DonutChart } from "@mantine/charts";
import { Alert, Button, Card, Grid, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";

import { WeeklyProgressCard } from "~/components/weekly-progress-card";
import { BreakdownTable } from "~/features/history/components/breakdown-table";
import { HeatmapLegend } from "~/features/history/components/heatmap-legend";
import { HistoryLearningHeatmap } from "~/features/history/components/history-learning-heatmap";
import {
  buildDonutCells,
  buildMonthPaceChartData,
  buildWeekPaceChartData,
  paceChartMonthTitle,
  paceChartWeekTitle,
  PACE_CHART_SERIES,
  type PaceChartPoint,
} from "~/features/history/lib/chart-data";
import type { AnalysisScope } from "~/features/history/schemas/analysis-scope-schema";
import type {
  DayBreakdown,
  HeatmapDay,
  MonthBreakdown,
  WeekBreakdown,
} from "~/features/history/types/history";

import tabBarClasses from "~/features/history/components/history-tab-bar.module.css";

type HistoryAnalysisPanelProps = {
  day: DayBreakdown;
  heatmapDays: HeatmapDay[];
  month: MonthBreakdown;
  onDayClick: (dateJst: DateJst) => void;
  onScopeChange: (scope: AnalysisScope) => void;
  scope: AnalysisScope;
  selectedDateJst: DateJst;
  todayJst: DateJst;
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

function PaceChartCard({
  data,
  subtitle,
  title,
  xAxisAngle,
}: {
  data: PaceChartPoint[];
  subtitle?: string;
  title: string;
  xAxisAngle?: number;
}) {
  return (
    <Card aria-labelledby={`${title}-pace`} padding="md">
      <Title id={`${title}-pace`} order={3}>
        {title}
      </Title>
      {subtitle ? (
        <Text c="dimmed" size="sm">
          {subtitle}
        </Text>
      ) : null}
      <CompositeChart
        data={data}
        dataKey="label"
        gridAxis="x"
        h={220}
        legendProps={{ height: 36, verticalAlign: "bottom" }}
        maxBarWidth={20}
        series={[...PACE_CHART_SERIES]}
        tickLine="y"
        valueFormatter={(value) => `${value}分`}
        withLegend
        xAxisProps={xAxisAngle === undefined ? undefined : { angle: xAxisAngle }}
      />
    </Card>
  );
}

function DonutSection({
  breakdown,
  title,
}: {
  breakdown: {
    byCategory: DayBreakdown["byCategory"];
    confirmedMinutes: number;
    isRest?: boolean;
    skippedMinutes: number;
  };
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
  heatmapDays,
  month,
  onDayClick,
  onScopeChange,
  scope,
  selectedDateJst,
  todayJst,
  week,
  yearMonth,
}: HistoryAnalysisPanelProps) {
  return (
    <Stack gap="md">
      <SegmentedControl
        className={tabBarClasses.tabBar}
        data={[
          { label: "日", value: "day" },
          { label: "週", value: "week" },
          { label: "月", value: "month" },
        ]}
        fullWidth
        onChange={(value) => onScopeChange(value as AnalysisScope)}
        value={scope}
      />
      <Text c="dimmed" size="sm" ta="center">
        {scope === "day" && selectedDateJst}
        {scope === "week" && `${week.weekStart} 〜 ${week.weekEnd}`}
        {scope === "month" && formatYearMonth(yearMonth)}
      </Text>

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
          <Title order={4} ta="center">
            学習量（直近365日）
          </Title>
          <Text c="dimmed" size="xs" ta="center">
            色の濃さは1日の学習時間です。記録のない日は休養です。
          </Text>
          <HistoryLearningHeatmap days={heatmapDays} onDayClick={onDayClick} todayJst={todayJst} />
          <HeatmapLegend />
        </Stack>
      ) : null}

      <Grid>
        {scope === "week" ? (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PaceChartCard
              data={buildWeekPaceChartData(week.byDay, heatmapDays)}
              subtitle="日別ペース"
              title={paceChartWeekTitle(week.weekStart, week.weekEnd)}
            />
          </Grid.Col>
        ) : null}
        {scope === "month" ? (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PaceChartCard
              data={buildMonthPaceChartData(month.days)}
              subtitle="日別ペース"
              title={paceChartMonthTitle(yearMonth)}
              xAxisAngle={-45}
            />
          </Grid.Col>
        ) : null}
        <Grid.Col span={{ base: 12, md: scope === "day" ? 12 : 6 }}>
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
        <Button
          renderRoot={(props) => (
            <Link {...props} params={{ dateJst: selectedDateJst }} to="/days/$dateJst" />
          )}
        >
          この日を開く
        </Button>
      ) : null}
    </Stack>
  );
}
