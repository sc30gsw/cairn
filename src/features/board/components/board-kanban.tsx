import type { DropResult } from "@hello-pangea/dnd";
import { ActionIcon, Badge, Box, Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { Result } from "better-result";
import { useEffect, useRef, useState } from "react";
import type { DateJst } from "~domain/jst";
import { hasTimerState, measuredMs, timerMinutes, timerRunState } from "~domain/rowTimer";

import { ReviewBadge } from "~/components/review-badge";
import { TruncatedText } from "~/components/truncated-text";
import { BoardKanbanCardMenu } from "~/features/board/components/board-kanban-card-menu";
import {
  BoardKanbanConfirmModal,
  needsKanbanConfirmEditor,
} from "~/features/board/components/board-kanban-confirm-modal";
import { RowTimerChip } from "~/features/board/components/row-timer-chip";
import { useBoardKanbanActions } from "~/features/board/hooks/use-board-kanban-actions";
import {
  computeOrderedRowIds,
  groupRowsByKanbanColumn,
  hasRowOrderChanged,
  KANBAN_COLUMNS,
  shiftRowWithinColumn,
  type KanbanColumn,
  type KanbanStatusMove,
  resolveKanbanStatusMove,
} from "~/features/board/lib/kanban-order";
import type { BoardRow } from "~/features/board/types/board";
import { useDnd } from "~/hooks/use-dnd";
import { useTimerTick } from "~/hooks/use-timer-tick";
import { RECORD_STATUS_UI, statusTooltip } from "~/lib/record-status-ui";
import { serverNowMs } from "~/lib/server-clock";
import { formatTimerClock } from "~/lib/timer-clock";

import classes from "~/features/board/components/board-kanban.module.css";

type BoardKanbanProps = {
  dateJst: DateJst;
  interactive?: boolean;
  rows: readonly BoardRow[];
};

type ConfirmTarget = {
  orderedRowIds: BoardRow["_id"][];
  prefillMinutes: number | null;
  row: BoardRow;
};

function RecordCard({
  disabled,
  dragHandleProps,
  dragging,
  onConfirm,
  onFlagReview,
  onResume,
  onShift,
  onStatusMove,
  onStop,
  onUnflagReview,
  row,
  rows,
  todayJst,
}: {
  disabled: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLElement> | undefined;
  dragging: boolean;
  onConfirm: () => void;
  onFlagReview: (row: BoardRow, dueJst: DateJst) => void;
  onResume: () => void;
  onShift: (direction: -1 | 1, row: BoardRow) => void;
  onStatusMove: (move: Exclude<KanbanStatusMove, "noop">, row: BoardRow) => Promise<unknown>;
  onStop: () => void;
  onUnflagReview: (row: BoardRow) => void;
  row: BoardRow;
  rows: readonly BoardRow[];
  todayJst: DateJst;
}) {
  const badge = RECORD_STATUS_UI[row.status];
  const detail = row.content === "" ? row.category : `${row.category} · ${row.content}`;

  return (
    <Card className={classes.card} data-dragging={dragging || undefined} padding="sm" withBorder>
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <Box visibleFrom="md">
          <Tooltip label="ドラッグして並べ替え・移動" withArrow>
            <ActionIcon
              aria-label={`${row.itemName} の順序を変更`}
              color="gray"
              disabled={disabled}
              size="sm"
              variant="subtle"
              {...dragHandleProps}
            >
              <IconGripVertical aria-hidden size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Box>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <TruncatedText fw={600} lineClamp={1} size="sm">
            {row.itemName}
          </TruncatedText>
          <TruncatedText c="dimmed" lineClamp={1} size="xs">
            {detail}
          </TruncatedText>
          <Group gap={4} wrap="wrap">
            <Tooltip label={statusTooltip(row.status)} withArrow>
              <Badge color={badge.color} size="sm" variant="light">
                {badge.label}
              </Badge>
            </Tooltip>
            <ReviewBadge review={row.review} />
          </Group>
        </Stack>
        <BoardKanbanCardMenu
          disabled={disabled}
          onFlagReview={onFlagReview}
          onShift={onShift}
          onStatusMove={onStatusMove}
          onUnflagReview={onUnflagReview}
          row={row}
          rows={rows}
          todayJst={todayJst}
        />
      </Group>
      {row.status === "進行中" ? (
        <RowTimerChip
          disabled={disabled}
          onConfirm={onConfirm}
          onResume={onResume}
          onStop={onStop}
          row={row}
        />
      ) : null}
    </Card>
  );
}

function columnTimerLabel(
  status: KanbanColumn,
  rows: readonly BoardRow[],
  nowMs: number,
): string | null {
  if (status !== "進行中") {
    return null;
  }
  const measuring = rows.find((row) => timerRunState(row.timer) === "計測中");
  if (measuring === undefined) {
    return null;
  }
  return `計測 ${formatTimerClock(measuredMs(measuring.timer, nowMs))}`;
}

export function BoardKanban({ dateJst, interactive = true, rows }: BoardKanbanProps) {
  const {
    onApplyOrder,
    onFlagReview,
    onMoveAndApplyOrder,
    onUnstart,
    onResumeTimer,
    onSkip,
    onStatusMove,
    onStopTimer,
    onUnflagReview,
    today,
  } = useBoardKanbanActions(dateJst);
  const { DragDropContext, Draggable, Droppable } = useDnd();
  const grouped = groupRowsByKanbanColumn(rows);
  const hasMeasuringRow = rows.some((row) => timerRunState(row.timer) === "計測中");
  const nowMs = useTimerTick(hasMeasuringRow);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const mutationQueueRef = useRef<Promise<void> | null>(null);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const next = (mutationQueueRef.current ?? Promise.resolve()).then(operation);
    mutationQueueRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async function moveRow(
    move: Exclude<KanbanStatusMove, "noop">,
    row: BoardRow,
  ): Promise<"applied" | "deferred" | "failed"> {
    return await enqueueMutation(async () => {
      const currentRows = rowsRef.current;
      const currentRow = currentRows.find((entry) => entry._id === row._id) ?? row;
      if ((move === "skip" || move === "unstart") && hasTimerState(currentRow.timer)) {
        const measuredMinutes = timerMinutes(measuredMs(currentRow.timer, serverNowMs()));
        const successMessage = `計測 ${String(measuredMinutes)}分を捨てました`;
        const result = await (move === "skip"
          ? onSkip({ rowId: currentRow._id }, successMessage)
          : onUnstart({ rowId: currentRow._id }, successMessage));
        return Result.isError(result) ? "failed" : "applied";
      }
      let deferred = false;
      const result = await onStatusMove(
        move,
        currentRow,
        (target) => {
          deferred = true;
          setConfirmTarget({ ...target, orderedRowIds: currentRows.map((entry) => entry._id) });
        },
        currentRows.map((entry) => entry._id),
      );
      if (deferred) return "deferred";
      return result !== undefined && Result.isError(result) ? "failed" : "applied";
    });
  }

  async function requestConfirm(row: BoardRow) {
    await enqueueMutation(async () => {
      const currentRows = rowsRef.current;
      const currentRow = currentRows.find((entry) => entry._id === row._id) ?? row;
      await onStatusMove(
        "confirm",
        currentRow,
        (target) => {
          setConfirmTarget({ ...target, orderedRowIds: currentRows.map((entry) => entry._id) });
        },
        currentRows.map((entry) => entry._id),
      );
    });
  }

  function shiftRow(direction: -1 | 1, row: BoardRow) {
    void enqueueMutation(() => {
      const orderedRowIds = shiftRowWithinColumn(rowsRef.current, row._id, direction);
      return orderedRowIds === null
        ? Promise.resolve(undefined)
        : onApplyOrder({ dateJst, orderedRowIds });
    });
  }

  async function handleDragEnd(result: DropResult) {
    if (!interactive) {
      return;
    }

    const currentRows = rowsRef.current;
    const { destination, draggableId, source } = result;
    if (destination === null) {
      return;
    }

    const sourceStatus = source.droppableId as KanbanColumn;
    const destinationStatus = destination.droppableId as KanbanColumn;
    const row = currentRows.find((entry) => entry._id === draggableId);
    if (row === undefined) {
      return;
    }

    const orderedRowIds = computeOrderedRowIds(
      currentRows,
      { index: source.index, status: sourceStatus },
      { index: destination.index, status: destinationStatus },
      row._id,
    );

    const statusMove = resolveKanbanStatusMove(row.status, destinationStatus);
    if (statusMove === "noop") {
      if (hasRowOrderChanged(currentRows, orderedRowIds)) {
        await enqueueMutation(() => onApplyOrder({ dateJst, orderedRowIds }));
      }
      return;
    }

    if (statusMove === "confirm" && needsKanbanConfirmEditor(row)) {
      setConfirmTarget({ orderedRowIds, prefillMinutes: null, row });
      return;
    }

    const successMessage =
      statusMove === "confirm"
        ? "記録を確定しました"
        : statusMove === "skip"
          ? "スキップしました"
          : statusMove === "unskip"
            ? "スキップを取り消しました"
            : statusMove === "unconfirm"
              ? "確定を取り消しました"
              : statusMove === "start"
                ? "計測を開始しました"
                : statusMove === "unstart"
                  ? "計測を停止しました"
                  : statusMove === "reopen"
                    ? "記録を再開しました"
                    : undefined;
    await enqueueMutation(() =>
      onMoveAndApplyOrder(
        {
          content: statusMove === "confirm" ? row.content : undefined,
          dateJst,
          minutes: statusMove === "confirm" && !hasTimerState(row.timer) ? row.minutes : undefined,
          move: statusMove,
          orderedRowIds,
          rowId: row._id,
        },
        successMessage,
      ),
    );
  }

  return (
    <>
      <BoardKanbanConfirmModal
        onClose={() => {
          setConfirmTarget(null);
        }}
        onConfirm={async (input) => {
          if (confirmTarget === null) {
            return;
          }
          return await enqueueMutation(() =>
            onMoveAndApplyOrder(
              {
                content: input.content,
                dateJst,
                minutes: input.minutes,
                move: "confirm",
                orderedRowIds: confirmTarget.orderedRowIds,
                rowId: input.rowId,
              },
              `学習時間 ${String(input.minutes)}分を記録しました`,
            ),
          );
        }}
        opened={confirmTarget !== null}
        prefillMinutes={confirmTarget?.prefillMinutes ?? null}
        row={confirmTarget?.row ?? null}
      />
      <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
        <section aria-label="カンバンの列" className={classes.columns}>
          {KANBAN_COLUMNS.map((status) => {
            const columnRows = grouped[status];
            const timerLabel = columnTimerLabel(status, columnRows, nowMs);
            const statusColor = RECORD_STATUS_UI[status].color;
            return (
              <Droppable droppableId={status} isDropDisabled={!interactive} key={status}>
                {(provided, snapshot) => (
                  <Stack
                    aria-label={`${status} ${String(columnRows.length)}件`}
                    className={classes.column}
                    data-drag-over={snapshot.isDraggingOver || undefined}
                    gap="xs"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <Stack className={classes.columnHeader} gap={4}>
                      <Group gap="xs" justify="space-between" wrap="nowrap">
                        <Group gap={6} wrap="nowrap">
                          <Box aria-hidden bg={`${statusColor}.6`} className={classes.statusDot} />
                          <Tooltip label={statusTooltip(status)} withArrow>
                            <Text fw={600} size="sm">
                              {status}
                            </Text>
                          </Tooltip>
                        </Group>
                        <Badge color={statusColor} size="sm" variant="light">
                          {columnRows.length}
                        </Badge>
                      </Group>
                      {timerLabel === null ? null : (
                        <Text c="dimmed" size="xs">
                          {timerLabel}
                        </Text>
                      )}
                    </Stack>
                    {columnRows.length === 0 ? (
                      <Text c="dimmed" className={classes.emptyColumn} size="xs" ta="center">
                        {status}の記録はありません
                      </Text>
                    ) : (
                      columnRows.map((row, index) => (
                        <Draggable
                          draggableId={row._id}
                          index={index}
                          isDragDisabled={!interactive}
                          key={row._id}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                              <RecordCard
                                disabled={!interactive}
                                dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                                dragging={dragSnapshot.isDragging}
                                onConfirm={() => void requestConfirm(row)}
                                onFlagReview={(flaggedRow, dueJst) => {
                                  void enqueueMutation(() => onFlagReview(flaggedRow, dueJst));
                                }}
                                onResume={() =>
                                  void enqueueMutation(() => onResumeTimer({ rowId: row._id }))
                                }
                                onShift={shiftRow}
                                onStatusMove={moveRow}
                                onStop={() => void enqueueMutation(() => onStopTimer(row._id))}
                                onUnflagReview={(flaggedRow) => {
                                  void enqueueMutation(() => onUnflagReview(flaggedRow));
                                }}
                                row={row}
                                rows={rows}
                                todayJst={today}
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
        </section>
      </DragDropContext>
    </>
  );
}
