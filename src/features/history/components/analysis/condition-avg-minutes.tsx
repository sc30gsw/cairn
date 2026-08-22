import { Table, Text } from "@mantine/core";

import { ConditionBadge } from "~/components/condition-badge";
import { avgMinutesByCondition } from "~/features/history/lib/scope-days";
import type { HeatmapDay } from "~/features/history/types/history";

type ConditionAvgMinutesProps = {
  days: readonly HeatmapDay[];
};

export function ConditionAvgMinutes({ days }: ConditionAvgMinutesProps) {
  const rows = avgMinutesByCondition(days);

  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        この範囲にコンディション記録はありません。
      </Text>
    );
  }

  return (
    <Table captionSide="top" highlightOnHover striped withTableBorder>
      <Table.Caption className="text-left lg:text-center">
        コンディションを記録した日だけを対象に、1日あたりの平均確定分数を出します。
      </Table.Caption>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>コンディション</Table.Th>
          <Table.Th>平均分数</Table.Th>
          <Table.Th>日数</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={row.condition}>
            <Table.Td>
              <ConditionBadge condition={row.condition} />
            </Table.Td>
            <Table.Td>{row.avgMinutes}分</Table.Td>
            <Table.Td>{row.dayCount}日</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
