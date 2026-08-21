import { Badge, Card, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { STATUSES } from "~domain/domain";

import type { BoardObstacle, BoardRow } from "~/features/board/types/board";
import { RECORD_STATUS_UI } from "~/lib/record-status-ui";

const KANBAN_COLUMNS = [
  "未着手",
  "確定",
  "スキップ",
] as const satisfies readonly (typeof STATUSES)[number][];

type BoardKanbanProps = {
  checkpointLabel: string | null;
  obstacles: readonly BoardObstacle[];
  rows: readonly BoardRow[];
};

function groupRows(rows: readonly BoardRow[]): Record<(typeof KANBAN_COLUMNS)[number], BoardRow[]> {
  return {
    スキップ: rows.filter((row) => row.status === "スキップ"),
    未着手: rows.filter((row) => row.status === "未着手"),
    確定: rows.filter((row) => row.status === "確定"),
  };
}

function RecordCard({ row }: { row: BoardRow }) {
  const badge = RECORD_STATUS_UI[row.status];

  return (
    <Card component={Link} padding="sm" to="/" withBorder>
      <Text fw={600} lineClamp={1} size="sm">
        {row.itemName}
      </Text>
      <Text c="dimmed" lineClamp={1} size="xs">
        {row.category}
        {row.content === "" ? "" : ` · ${row.content}`}
      </Text>
      <Badge color={badge.color} mt={6} size="sm" variant="light">
        {badge.label}
      </Badge>
    </Card>
  );
}

function NextStepCard({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <Card component={Link} padding="sm" to="/goals" withBorder>
      <Text fw={600} lineClamp={2} size="sm">
        {title}
      </Text>
      <Text c="dimmed" lineClamp={2} size="xs">
        {subtitle}
      </Text>
    </Card>
  );
}

export function BoardKanban({ checkpointLabel, obstacles, rows }: BoardKanbanProps) {
  const grouped = groupRows(rows);

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {KANBAN_COLUMNS.map((status) => {
        const columnRows = grouped[status];
        return (
          <Stack gap="xs" key={status}>
            <Text fw={600} size="sm">
              {status}
            </Text>
            {columnRows.length === 0 ? (
              <Text c="dimmed" size="sm">
                なし
              </Text>
            ) : (
              columnRows.map((row) => <RecordCard key={row._id} row={row} />)
            )}
          </Stack>
        );
      })}
      <Stack gap="xs">
        <Text fw={600} size="sm">
          次の一手
        </Text>
        {obstacles.map((obstacle) => (
          <NextStepCard key={obstacle._id} subtitle={obstacle.ifText} title={obstacle.thenText} />
        ))}
        {checkpointLabel === null ? null : (
          <NextStepCard subtitle="チェックポイント" title={checkpointLabel} />
        )}
        {obstacles.length === 0 && checkpointLabel === null ? (
          <Text c="dimmed" size="sm">
            なし
          </Text>
        ) : null}
      </Stack>
    </div>
  );
}
