import { Alert, Button, Card, Grid, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { BarChart, DonutChart } from "@mantine/charts";
import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import { WeeklyProgressCard } from "~/features/goals/components/weekly-progress-card";
import { BreakdownTable } from "~/features/history/components/breakdown-table";
import { buildDonutCells, buildWeekBarData } from "~/features/history/lib/chart-data";

type DayBreakdown = FunctionReturnType<typeof api.history.dayBreakdown>;
type WeekBreakdown = FunctionReturnType<typeof api.history.weekBreakdown>;
type MonthBreakdown = FunctionReturnType<typeof api.history.monthBreakdown>;

type AnalysisScope = "day" | "month" | "week";

type HistoryAnalysisPanelProps = {
  day: DayBreakdown;
  month: MonthBreakdown;
  onScopeChange: (scope: AnalysisScope) => void;
  scope: AnalysisScope;
  selectedDateJst: string;
  todayJst: string;
  week: WeekBreakdown;
};

function RestAlert() {
  return (
    <Alert color="yellow" title="休養">
      この日は記録がありません。
    </Alert>
  );
}

function EmptyConfirmedAlert() {
  return (
    <Alert color="blue" title="確定なし">
      確定した記録がありません。
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
      <DonutChart
        chartLabel={`${breakdown.confirmedMinutes}分`}
        data={data}
        size={200}
        strokeColor="var(--mantine-color-body)"
        thickness={24}
        tooltipDataSource="segment"
        valueFormatter={(value) => `${value}分`}
        withLegend
      />
    </Card>
  );
}

export function HistoryAnalysisPanel({
  day,
  month,
  onScopeChange,
  scope,
  selectedDateJst,
  todayJst,
  week,
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
          {scope === "month" && selectedDateJst.slice(0, 7)}
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
                series={[{ color: "blue.6", name: "確定" }]}
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

      {scope === "month" ? (
        <Text c="dimmed" size="sm">
          月の推移は「月」タブのカレンダーで確認できます。
        </Text>
      ) : null}

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
        <Button component={Link} to="/days/$dateJst" params={{ dateJst: selectedDateJst }}>
          この日を開く
        </Button>
      ) : null}
    </Stack>
  );
}
