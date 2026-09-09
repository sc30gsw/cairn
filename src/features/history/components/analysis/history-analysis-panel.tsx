import { CompositeChart, DonutChart } from "@mantine/charts";
import type { ChartReferenceAreaProps, ChartReferenceDotProps } from "@mantine/charts";
import { Alert, Button, Card, Grid, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";

import { HistoryConditionMemoSections } from "~/features/history/components/analysis/history-condition-memo-sections";
import { WeekdayCategoryMatrix } from "~/features/history/components/analysis/weekday-category-matrix";
import { BreakdownTable } from "~/features/history/components/breakdown-table";
import { ConditionVolumeTable } from "~/features/history/components/condition-volume-table";
import { HeatmapLegend } from "~/features/history/components/heatmap-legend";
import { HistoryLearningHeatmap } from "~/features/history/components/history-learning-heatmap";
import {
  buildDonutCells,
  buildMonthPaceChartData,
  buildPaceSelectedDateReferenceDots,
  buildPaceWeekendReferenceAreas,
  buildWeekPaceChartData,
  paceChartMonthTitle,
  paceChartWeekTitle,
  PACE_CHART_SERIES,
  type PaceChartPoint,
} from "~/features/history/lib/chart-data";
import { daysInAnalysisScope } from "~/features/history/lib/scope-days";
import type { AnalysisScope } from "~/features/history/schemas/analysis-scope-schema";
import type {
  DayBreakdown,
  HeatmapDay,
  MonthBreakdown,
  WeekEvent,
  WeekBreakdown,
} from "~/features/history/types/history";

import tabBarClasses from "~/components/pills-tab-bar.module.css";

const EMPTY_WEEK_EVENTS: readonly WeekEvent[] = [];

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
  weekDays: HeatmapDay[];
  weekEvents?: readonly WeekEvent[];
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
  referenceAreas,
  referenceDots,
  xAxisAngle,
}: {
  data: PaceChartPoint[];
  referenceAreas?: ChartReferenceAreaProps[];
  referenceDots?: ChartReferenceDotProps[];
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
      {referenceAreas?.length || referenceDots?.length ? (
        <Text c="dimmed" size="xs">
          オレンジ帯:週末 / オレンジ点:選択日
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
        referenceAreas={referenceAreas}
        referenceDots={referenceDots}
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
    kind?: DayBreakdown["kind"];
    skippedMinutes: number;
  };
  title: string;
}) {
  if (breakdown.kind === "beforeRegistration") {
    return (
      <Alert color="gray" title="利用開始前">
        利用開始前の日です。この日の記録も追加できます。
      </Alert>
    );
  }
  if (breakdown.kind === "rest") {
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
  weekDays,
  weekEvents = EMPTY_WEEK_EVENTS,
  yearMonth,
}: HistoryAnalysisPanelProps) {
  const scopeDays = daysInAnalysisScope(scope, selectedDateJst, month, heatmapDays, weekDays);
  const weekPaceData = buildWeekPaceChartData(week.byDay, heatmapDays);
  const monthPaceData = buildMonthPaceChartData(month.days);
  const breakdown = { day, week, month }[scope];
  const breakdownTitle = { day: "日次内訳", week: "週次内訳", month: "月次内訳" }[scope];
  const periodLabel = {
    day: selectedDateJst,
    week: `${week.weekStart} 〜 ${week.weekEnd}`,
    month: formatYearMonth(yearMonth),
  }[scope];

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
        {periodLabel}
      </Text>

      {scope === "month" ? (
        <Stack gap="xs">
          <Title order={4} ta="center">
            学習量（直近365日）
          </Title>
          <Text c="dimmed" size="xs" ta="center">
            色の濃さは1日の学習時間です。利用開始後、記録のない日は休養です。
          </Text>
          <HistoryLearningHeatmap days={heatmapDays} onDayClick={onDayClick} todayJst={todayJst} />
          <HeatmapLegend />
        </Stack>
      ) : null}

      <Grid>
        {scope === "week" ? (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PaceChartCard
              data={weekPaceData}
              referenceAreas={buildPaceWeekendReferenceAreas(weekPaceData)}
              referenceDots={buildPaceSelectedDateReferenceDots(weekPaceData, selectedDateJst)}
              subtitle="日別ペース"
              title={paceChartWeekTitle(week.weekStart, week.weekEnd)}
            />
          </Grid.Col>
        ) : null}
        {scope === "month" ? (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PaceChartCard
              data={monthPaceData}
              referenceAreas={buildPaceWeekendReferenceAreas(monthPaceData)}
              referenceDots={buildPaceSelectedDateReferenceDots(monthPaceData, selectedDateJst)}
              subtitle="日別ペース"
              title={paceChartMonthTitle(yearMonth)}
              xAxisAngle={-45}
            />
          </Grid.Col>
        ) : null}
        <Grid.Col span={{ base: 12, md: scope === "day" ? 12 : 6 }}>
          <DonutSection breakdown={breakdown} title={breakdownTitle} />
        </Grid.Col>
      </Grid>

      {scope === "week" ? (
        <WeekdayCategoryMatrix
          categories={week.byCategory.map((entry) => entry.category)}
          days={weekDays}
          events={weekEvents}
          title={paceChartWeekTitle(week.weekStart, week.weekEnd)}
          todayJst={todayJst}
        />
      ) : null}
      {scope === "month" ? (
        <WeekdayCategoryMatrix
          categories={month.byCategory.map((entry) => entry.category)}
          days={month.days}
          events={month.events}
          title={paceChartMonthTitle(yearMonth)}
          todayJst={todayJst}
        />
      ) : null}

      <Stack gap="xs">
        <Title order={4}>完了内訳</Title>
        <BreakdownTable confirmedMinutes={breakdown.confirmedMinutes} rows={breakdown.rows} />
      </Stack>

      <Stack gap="xs">
        <Title order={4}>コンディション別の学習量</Title>
        <ConditionVolumeTable rows={breakdown.byCondition} />
      </Stack>

      <HistoryConditionMemoSections
        scope={scope}
        scopeDays={scopeDays}
        selectedDateJst={selectedDateJst}
      />

      {scope === "day" ? (
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
