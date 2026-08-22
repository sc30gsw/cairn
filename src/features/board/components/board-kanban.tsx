import type { DropResult } from "@hello-pangea/dnd";
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";

import type {
  BoardApplyRowOrderInput,
  BoardConfirmRowInput,
  BoardSkipRowInput,
  BoardUnskipRowInput,
} from "~/features/board/hooks/board-mutations";
import {
  computeOrderedRowIds,
  groupRowsByKanbanColumn,
  hasRowOrderChanged,
  KANBAN_COLUMNS,
  type KanbanColumn,
  resolveKanbanStatusMove,
} from "~/features/board/lib/kanban-order";
import type { BoardObstacle, BoardRow } from "~/features/board/types/board";
import { useDnd } from "~/features/catalog/hooks/use-dnd";
import { RECORD_STATUS_UI } from "~/lib/record-status-ui";

type BoardKanbanProps = {
  checkpointLabel: string | null;
  dateJst: DateJst;
  obstacles: readonly BoardObstacle[];
  onApplyOrder: (input: BoardApplyRowOrderInput) => Promise<void>;
  onConfirm: (input: BoardConfirmRowInput) => Promise<void>;
  onSkip: (input: BoardSkipRowInput) => Promise<void>;
  onUnskip: (input: BoardUnskipRowInput) => Promise<void>;
  rows: readonly BoardRow[];
};

function RecordCard({
  dragHandleProps,
  row,
}: {
  dragHandleProps: React.HTMLAttributes<HTMLElement> | undefined;
  row: BoardRow;
}) {
  const badge = RECORD_STATUS_UI[row.status];

  return (
    <Card padding="sm" withBorder>
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <ActionIcon
          aria-label={`${row.itemName} の順序を変更`}
          color="gray"
          size="sm"
          variant="subtle"
          {...dragHandleProps}
        >
          <IconGripVertical size={16} />
        </ActionIcon>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text component={Link} fw={600} lineClamp={1} size="sm" to="/">
            {row.itemName}
          </Text>
          <Text c="dimmed" lineClamp={1} size="xs">
            {row.category}
            {row.content === "" ? "" : ` · ${row.content}`}
          </Text>
          <Badge color={badge.color} size="sm" variant="light">
            {badge.label}
          </Badge>
        </Stack>
      </Group>
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

export function BoardKanban({
  checkpointLabel,
  dateJst,
  obstacles,
  onApplyOrder,
  onConfirm,
  onSkip,
  onUnskip,
  rows,
}: BoardKanbanProps) {
  const { DragDropContext, Draggable, Droppable } = useDnd();
  const grouped = groupRowsByKanbanColumn(rows);

  async function handleDragEnd(result: DropResult) {
    const { destination, draggableId, source } = result;
    if (destination === null) {
      return;
    }

    const sourceStatus = source.droppableId as KanbanColumn;
    const destinationStatus = destination.droppableId as KanbanColumn;
    const row = rows.find((entry) => entry._id === draggableId);
    if (row === undefined) {
      return;
    }

    const orderedRowIds = computeOrderedRowIds(
      rows,
      { index: source.index, status: sourceStatus },
      { index: destination.index, status: destinationStatus },
      row._id,
    );

    const statusMove = resolveKanbanStatusMove(row.status, destinationStatus);
    if (statusMove === "confirm") {
      await onConfirm({
        content: row.content,
        minutes: row.minutes,
        rowId: row._id,
      });
    } else if (statusMove === "skip") {
      await onSkip({ rowId: row._id });
    } else if (statusMove === "unskip") {
      await onUnskip({ rowId: row._id });
    }

    if (hasRowOrderChanged(rows, orderedRowIds)) {
      await onApplyOrder({ dateJst, orderedRowIds });
    }
  }

  return (
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
                          <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                            <RecordCard
                              dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                              row={row}
                            />
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
    </DragDropContext>
  );
}
