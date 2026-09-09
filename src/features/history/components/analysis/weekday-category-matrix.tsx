import { MatrixChart } from "@mantine/charts";
import { Card, ScrollArea, Table, Text, Title } from "@mantine/core";
import type { DateJst } from "~domain/jst";

import {
  buildWeekdayCategoryMatrix,
  WEEKDAY_CATEGORY_MATRIX_LABELS,
} from "~/features/history/lib/chart-data";
import type { HeatmapDay, MonthEvent } from "~/features/history/types/history";

type WeekdayCategoryMatrixProps = {
  categories: readonly string[];
  days: readonly Pick<HeatmapDay, "dateJst" | "kind">[];
  events: readonly Pick<MonthEvent, "category" | "dateJst" | "minutes" | "status">[];
  todayJst: DateJst;
  title: string;
};

export function WeekdayCategoryMatrix({
  categories,
  days,
  events,
  todayJst,
  title,
}: WeekdayCategoryMatrixProps) {
  const data = buildWeekdayCategoryMatrix(events, days, todayJst, categories);
  const hasEligibleDay = days.some(
    (day) =>
      day.dateJst < todayJst && day.kind !== "beforeRegistration" && day.kind !== "unrecorded",
  );
  const hasMatrix = hasEligibleDay && data.length > 0;
  const maxAverage = Math.max(0, ...data.map((cell) => cell.value ?? 0));

  return (
    <Card aria-labelledby="weekday-category-matrix-title" padding="md">
      <Title id="weekday-category-matrix-title" order={3}>
        曜日ごとの平均学習量
      </Title>
      <Text c="dimmed" size="sm">
        {title}の昨日まで。休養日は0分として、カテゴリごとの曜日別1日平均を表示します。
      </Text>
      {hasMatrix ? (
        <MatrixChart
          aria-label={`${title}の曜日別カテゴリ平均分数`}
          cellRadius={4}
          data={data}
          domain={[0, maxAverage]}
          gap={3}
          getTooltipLabel={({ x, y, value }) => {
            const cell = data.find((entry) => entry.x === x && entry.y === y);
            return `${y}・${x}: ${value === null ? "対象日なし" : `${value}分（対象${cell?.days ?? 0}日）`}`;
          }}
          withLegend
          withTooltip
          withXLabels
          withYLabels
          xLabels={[...WEEKDAY_CATEGORY_MATRIX_LABELS]}
          xLabelsRotation={-45}
          yLabels={[...categories]}
          legendLabels={["0分", `${maxAverage}分`]}
        />
      ) : (
        <Text c="dimmed" mt="md" ta="center">
          {hasEligibleDay
            ? "対象期間に確定した記録がありません。"
            : "比較できる対象日がありません。"}
        </Text>
      )}
      {hasMatrix ? (
        <ScrollArea mt="md" type="auto">
          <Table captionSide="bottom" highlightOnHover miw={560} striped withTableBorder>
            <Table.Caption>
              数値は対象期間の昨日までにおける曜日ごとの1日平均分数です。
            </Table.Caption>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>カテゴリ</Table.Th>
                {WEEKDAY_CATEGORY_MATRIX_LABELS.map((weekday) => (
                  <Table.Th key={weekday}>
                    {weekday}
                    <br />
                    平均 / 合計 / 日数
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categories.map((category) => (
                <Table.Tr key={category}>
                  <Table.Th scope="row">{category}</Table.Th>
                  {WEEKDAY_CATEGORY_MATRIX_LABELS.map((weekday) => {
                    const cell = data.find((entry) => entry.x === weekday && entry.y === category);
                    return (
                      <Table.Td key={weekday}>
                        {cell?.value === null
                          ? "対象日なし"
                          : `${cell?.value ?? 0}分 / ${cell?.totalMinutes ?? 0}分 / ${cell?.days ?? 0}日`}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      ) : null}
    </Card>
  );
}
