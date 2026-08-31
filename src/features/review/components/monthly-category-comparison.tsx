import { BarChart } from "@mantine/charts";
import { Card, EmptyState, Stack, Table, Text, Title } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";

import {
  buildCategoryComparisonRows,
  categoryComparisonChartRows,
} from "~/features/review/lib/category-comparison";
import { yearMonthLabel } from "~/features/review/lib/monthly-review-labels";
import type { MonthlyReview } from "~/features/review/types/monthly-review";
import { NUMERAL_FONT } from "~/lib/theme";

const COMPARISON_SERIES = [
  { color: "orange.5", name: "今月" },
  { color: "gray.6", name: "先月" },
] as const;
const TITLE_ID = "monthly-category-comparison";

type MonthlyCategoryComparisonProps = Pick<
  MonthlyReview,
  "byCategory" | "previousByCategory" | "previousYearMonth"
>;

export function MonthlyCategoryComparison({
  byCategory,
  previousByCategory,
  previousYearMonth,
}: MonthlyCategoryComparisonProps) {
  const rows = buildCategoryComparisonRows(byCategory, previousByCategory);
  const chartRows = categoryComparisonChartRows(rows);

  return (
    <Stack gap="xs">
      <Title id={TITLE_ID} order={3}>
        カテゴリ内訳の月比較
      </Title>
      <Text c="var(--cairn-muted-2)" size="xs">
        先月は {yearMonthLabel(previousYearMonth)}。確定した記録の分数で比べます。
      </Text>

      {rows.length === 0 ? (
        <EmptyState
          description="記録を確定すると、カテゴリごとの先月比がここに出ます。"
          icon={<IconChartBar aria-hidden />}
          title="比べられる記録がありません"
        />
      ) : (
        <>
          {chartRows.length === 0 ? null : (
            <Card aria-labelledby={TITLE_ID} padding="md">
              <BarChart
                data={chartRows.map((row) => ({
                  category: row.category,
                  今月: row.currentMinutes,
                  先月: row.previousMinutes,
                }))}
                dataKey="category"
                gridAxis="y"
                h={240}
                maxBarWidth={28}
                series={[...COMPARISON_SERIES]}
                tickLine="y"
                valueFormatter={(value) => `${value}分`}
                withLegend
              />
            </Card>
          )}

          <Table.ScrollContainer minWidth={420}>
            <Table highlightOnHover striped="odd" verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>カテゴリ</Table.Th>
                  <Table.Th>今月</Table.Th>
                  <Table.Th>先月</Table.Th>
                  <Table.Th>増減</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.category}>
                    <Table.Td>{row.category}</Table.Td>
                    <Table.Td ff={NUMERAL_FONT}>{row.currentMinutes}分</Table.Td>
                    <Table.Td ff={NUMERAL_FONT}>{row.previousMinutes}分</Table.Td>
                    <Table.Td ff={NUMERAL_FONT}>{row.deltaLabel}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </>
      )}
    </Stack>
  );
}
