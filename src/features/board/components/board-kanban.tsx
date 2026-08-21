import type { DropResult } from "@hello-pangea/dnd";
import { Badge, Card, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { STATUSES } from "~domain/domain";

import { BoardConfirmRowModal } from "~/features/board/components/board-confirm-row-modal";
import type {
  BoardConfirmRowInput,
  BoardSkipRowInput,
  BoardUnskipRowInput,
} from "~/features/board/hooks/board-mutations";
import type { BoardObstacle, BoardRow } from "~/features/board/types/board";
import { useDnd } from "~/features/catalog/hooks/use-dnd";
import { RECORD_STATUS_UI } from "~/lib/record-status-ui";

const KANBAN_COLUMNS = [
  "未着手",
  "確定",
  "スキップ",
] as const satisfies readonly (typeof STATUSES)[number][];

type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

type BoardKanbanProps = {
  checkpointLabel: string | null;
  obstacles: readonly BoardObstacle[];
  onConfirm: (input: BoardConfirmRowInput) => Promise<void>;
  onSkip: (input: BoardSkipRowInput) => Promise<void>;
  onUnskip: (input: BoardUnskipRowInput) => Promise<void>;
  rows: readonly BoardRow[];
};

function groupRows(rows: readonly BoardRow[]): Record<KanbanColumn, BoardRow[]> {
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

function resolveStatusMove(
  sourceStatus: BoardRow["status"],
  destinationStatus: KanbanColumn,
): "confirm" | "noop" | "skip" | "unskip" {
  if (sourceStatus === destinationStatus) {
    return "noop";
  }
  if (destinationStatus === "確定") {
    return "confirm";
  }
  if (destinationStatus === "スキップ") {
    return "skip";
  }
  if (destinationStatus === "未着手" && sourceStatus === "スキップ") {
    return "unskip";
  }
  return "noop";
}

export function BoardKanban({
  checkpointLabel,
  obstacles,
  onConfirm,
  onSkip,
  onUnskip,
  rows,
}: BoardKanbanProps) {
  const { DragDropContext, Draggable, Droppable } = useDnd();
  const grouped = groupRows(rows);
  const [confirmRow, setConfirmRow] = useState<BoardRow | null>(null);

  async function handleDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (destination === null) {
      return;
    }
    const destinationStatus = destination.droppableId as KanbanColumn;
    const row = rows.find((entry) => entry._id === draggableId);
    if (row === undefined) {
      return;
    }
    const action = resolveStatusMove(row.status, destinationStatus);
    if (action === "noop") {
      return;
    }
    if (action === "confirm") {
      setConfirmRow(row);
      return;
    }
    if (action === "skip") {
      await onSkip({ rowId: row._id });
      return;
    }
    await onUnskip({ rowId: row._id });
  }

  return (
    <>
      <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
        <div className="grid gap-3 md:grid-cols-4">
          {KANBAN_COLUMNS.map((status) => {
            const columnRows = grouped[status];
            return (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps}>
                    <Text fw={600} size="sm">
                      {status}
                    </Text>
                    {columnRows.length === 0 ? (
                      <Text c="dimmed" size="sm">
                        なし
                      </Text>
                    ) : (
                      columnRows.map((row, index) => (
                        <Draggable draggableId={row._id} index={index} key={row._id}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <RecordCard row={row} />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </Stack>
                )}
              </Droppable>
            );
          })}
          <Stack gap="xs">
            <Text fw={600} size="sm">
              次の一手
            </Text>
            {obstacles.map((obstacle) => (
              <NextStepCard
                key={obstacle._id}
                subtitle={obstacle.ifText}
                title={obstacle.thenText}
              />
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
      </DragDropContext>
      <BoardConfirmRowModal
        onClose={() => setConfirmRow(null)}
        onConfirm={onConfirm}
        opened={confirmRow !== null}
        row={confirmRow}
      />
    </>
  );
}
