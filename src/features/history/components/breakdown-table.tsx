import { Progress, Table, Text } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

type BreakdownRow = FunctionReturnType<typeof api.history.dayBreakdown>["rows"][number];

type BreakdownTableProps = {
  confirmedMinutes: number;
  rows: readonly BreakdownRow[];
};

const STATUS_LABEL = {
  スキップ: "見送り",
  未着手: "未着手",
  確定: "確定",
} as const;

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
      <Table.Caption>内訳一覧</Table.Caption>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>項目</Table.Th>
          <Table.Th>カテゴリ</Table.Th>
          <Table.Th>状態</Table.Th>
          <Table.Th>分数</Table.Th>
          <Table.Th>比率</Table.Th>
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
              <Table.Td>{STATUS_LABEL[row.status]}</Table.Td>
              <Table.Td>{row.minutes}分</Table.Td>
              <Table.Td>
                {row.status === "確定" ? (
                  <Progress aria-label={`${row.itemName}の比率`} size="sm" value={ratio} />
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
