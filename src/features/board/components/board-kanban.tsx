import type { DropResult } from "@hello-pangea/dnd";
import { ActionIcon, Badge, Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { DateJst } from "~domain/jst";

import { TruncatedText } from "~/components/truncated-text";
import {
  BoardKanbanConfirmModal,
  needsKanbanConfirmEditor,
} from "~/features/board/components/board-kanban-confirm-modal";
import { useBoardKanbanActions } from "~/features/board/hooks/use-board-kanban-actions";
import {
  computeOrderedRowIds,
  groupRowsByKanbanColumn,
  hasRowOrderChanged,
  KANBAN_COLUMNS,
  type KanbanColumn,
  resolveKanbanStatusMove,
} from "~/features/board/lib/kanban-order";
import type { BoardObstacle, BoardRow } from "~/features/board/types/board";
import { useDnd } from "~/hooks/use-dnd";
import { RECORD_STATUS_UI, statusTooltip } from "~/lib/record-status-ui";

type BoardKanbanProps = {
  checkpointLabel: string | null;
  dateJst: DateJst;
  interactive?: boolean;
  obstacles: readonly BoardObstacle[];
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
  const detail = row.content === "" ? row.category : `${row.category} · ${row.content}`;

  return (
    <Card padding="sm" withBorder>
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <Tooltip label="ドラッグして並べ替え・移動" withArrow>
          <ActionIcon
            aria-label={`${row.itemName} の順序を変更`}
            color="gray"
            size="sm"
            variant="subtle"
            {...dragHandleProps}
          >
            <IconGripVertical aria-hidden size={16} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <TruncatedText fw={600} lineClamp={1} size="sm" to="/">
            {row.itemName}
          </TruncatedText>
          <TruncatedText c="dimmed" lineClamp={1} size="xs">
            {detail}
          </TruncatedText>
          <Tooltip label={statusTooltip(row.status)} withArrow>
            <Badge color={badge.color} size="sm" variant="light">
              {badge.label}
            </Badge>
          </Tooltip>
        </Stack>
      </Group>
    </Card>
  );
}

function NextStepCard({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <Card component={Link} padding="sm" to="/goals" withBorder>
      <TruncatedText fw={600} lineClamp={2} size="sm">
        {title}
      </TruncatedText>
      <TruncatedText c="dimmed" lineClamp={2} size="xs">
        {subtitle}
      </TruncatedText>
    </Card>
  );
}

export function BoardKanban({
  checkpointLabel,
  dateJst,
  interactive = true,
  obstacles,
  rows,
}: BoardKanbanProps) {
  const { onApplyOrder, onConfirm, onPause, onReopen, onSkip, onStart, onUnconfirm, onUnskip } =
    useBoardKanbanActions(dateJst);
  const { DragDropContext, Draggable, Droppable } = useDnd();
  const grouped = groupRowsByKanbanColumn(rows);
  const [confirmRow, setConfirmRow] = useState<BoardRow | null>(null);
  const pendingOrderRef = useRef<{
    dateJst: DateJst;
    orderedRowIds: BoardRow["_id"][];
  } | null>(null);

  async function applyPendingOrder() {
    const pendingOrder = pendingOrderRef.current;
    if (pendingOrder === null) {
      return;
    }
    await onApplyOrder(pendingOrder);
    pendingOrderRef.current = null;
  }

  async function handleDragEnd(result: DropResult) {
    if (!interactive) {
      return;
    }

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
    const orderChanged = hasRowOrderChanged(rows, orderedRowIds);
    if (orderChanged) {
      pendingOrderRef.current = { dateJst, orderedRowIds };
    }

    if (statusMove === "confirm") {
      if (needsKanbanConfirmEditor(row)) {
        setConfirmRow(row);
        return;
      }
      await onConfirm({
        content: row.content,
        minutes: row.minutes,
        rowId: row._id,
      });
    } else if (statusMove === "skip") {
      await onSkip({ rowId: row._id });
    } else if (statusMove === "unskip") {
      await onUnskip({ rowId: row._id });
    } else if (statusMove === "unconfirm") {
      await onUnconfirm({ rowId: row._id });
    } else if (statusMove === "start") {
      await onStart({ rowId: row._id });
    } else if (statusMove === "pause") {
      await onPause({ rowId: row._id });
    } else if (statusMove === "reopen") {
      await onReopen({ rowId: row._id });
    }

    if (orderChanged) {
      await onApplyOrder({ dateJst, orderedRowIds });
      pendingOrderRef.current = null;
    }
  }

  return (
    <>
      <BoardKanbanConfirmModal
        onClose={() => {
          setConfirmRow(null);
          pendingOrderRef.current = null;
        }}
        onConfirm={async (input) => {
          await onConfirm(input);
          await applyPendingOrder();
        }}
        opened={confirmRow !== null}
        row={confirmRow}
      />
      <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
        <div className="grid gap-3 md:grid-cols-5">
          {KANBAN_COLUMNS.map((status) => {
            const columnRows = grouped[status];
            return (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps}>
                    <Tooltip label={statusTooltip(status)} withArrow>
                      <Text fw={600} size="sm">
                        {status}
                      </Text>
                    </Tooltip>
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
            <Tooltip label="障害対策と次の一手" withArrow>
              <Text fw={600} size="sm">
                チェックポイント
              </Text>
            </Tooltip>
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
    </>
  );
}
