import { Table, Text } from "@mantine/core";

import type { DayBreakdown } from "~/features/history/types/history";

type ConditionVolumeTableProps = {
  rows: DayBreakdown["byCondition"];
};

export function ConditionVolumeTable({ rows }: ConditionVolumeTableProps) {
  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        確定した学習量がありません。
      </Text>
    );
  }

  return (
    <Table captionSide="top" highlightOnHover striped withTableBorder>
      <Table.Caption className="text-left lg:text-center">
        その日のコンディションで分けた確定分数。消化の定義は変えません。
      </Table.Caption>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>コンディション</Table.Th>
          <Table.Th>分数</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={row.condition}>
            <Table.Td>{row.condition}</Table.Td>
            <Table.Td>{row.minutes}分</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
