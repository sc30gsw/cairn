import { EmptyState, Group, Progress, Table, Text } from "@mantine/core";
import { IconListCheck } from "@tabler/icons-react";

import type { BreakdownRow } from "~/features/history/types/history";

type BreakdownTableProps = {
  confirmedMinutes: number;
  rows: readonly BreakdownRow[];
};

export function BreakdownTable({ confirmedMinutes, rows }: BreakdownTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        description="記録を確定すると、項目ごとの内訳がここに出ます。"
        icon={<IconListCheck aria-hidden />}
        title="完了した記録がありません"
      />
    );
  }

  return (
    <Table captionSide="top" highlightOnHover striped withTableBorder>
      <Table.Caption className="text-left lg:text-center">
        完了項目のみ。同一項目は合算。
        <br />
        確定比は、選択範囲の確定合計（{confirmedMinutes}
        分）に占める割合です。
      </Table.Caption>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>項目</Table.Th>
          <Table.Th>カテゴリ</Table.Th>
          <Table.Th>分数</Table.Th>
          <Table.Th>確定比</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => {
          const ratio =
            confirmedMinutes > 0 ? Math.round((row.minutes / confirmedMinutes) * 100) : 0;
          return (
            <Table.Tr key={`${row.category}-${row.itemName}`}>
              <Table.Td>{row.itemName}</Table.Td>
              <Table.Td>{row.category}</Table.Td>
              <Table.Td>{row.minutes}分</Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <Progress
                    aria-label={`${row.itemName}、確定合計${confirmedMinutes}分中${row.minutes}分（${ratio}%）`}
                    flex={1}
                    miw={80}
                    size="sm"
                    value={ratio}
                  />
                  <Text aria-hidden size="sm" w={40}>
                    {ratio}%
                  </Text>
                </Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
