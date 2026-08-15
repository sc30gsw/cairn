import { Group, Progress, Table, Text } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import { recordStatusLabel } from "~/features/history/lib/record-status-label";

type BreakdownRow = FunctionReturnType<typeof api.history.dayBreakdown>["rows"][number];

type BreakdownTableProps = {
  confirmedMinutes: number;
  rows: readonly BreakdownRow[];
};

export function BreakdownTable({ confirmedMinutes, rows }: BreakdownTableProps) {
  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        記録がありません。
      </Text>
    );
  }

  return (
    <Table captionSide="top" highlightOnHover striped withTableBorder>
      <Table.Caption>
        内訳一覧。確定比は、選択範囲の確定合計（{confirmedMinutes}分）に占める割合です。
      </Table.Caption>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>項目</Table.Th>
          <Table.Th>カテゴリ</Table.Th>
          <Table.Th>状態</Table.Th>
          <Table.Th>分数</Table.Th>
          <Table.Th>確定比</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => {
          const ratio =
            row.status === "確定" && confirmedMinutes > 0
              ? Math.round((row.minutes / confirmedMinutes) * 100)
              : 0;
          return (
            <Table.Tr key={`${row.itemName}-${row.status}-${row.minutes}`}>
              <Table.Td>{row.itemName}</Table.Td>
              <Table.Td>{row.category}</Table.Td>
              <Table.Td>{recordStatusLabel(row.status)}</Table.Td>
              <Table.Td>{row.minutes}分</Table.Td>
              <Table.Td>
                {row.status === "確定" ? (
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
                ) : (
                  "—"
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
