import type { DropResult } from "@hello-pangea/dnd";
import { ActionIcon, Badge, Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconGripVertical } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { DateJst } from "~domain/jst";
import { hasTimerState, measuredMs, timerMinutes, timerRunState } from "~domain/rowTimer";

import { TruncatedText } from "~/components/truncated-text";
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
  type KanbanColumn,
  resolveKanbanStatusMove,
} from "~/features/board/lib/kanban-order";
import type { BoardObstacle, BoardRow } from "~/features/board/types/board";
import { useDnd } from "~/hooks/use-dnd";
import { RECORD_STATUS_UI, statusTooltip } from "~/lib/record-status-ui";
import { serverNowMs } from "~/lib/server-clock";
import { formatTimerClock } from "~/lib/timer-clock";

type BoardKanbanProps = {
  checkpointLabel: string | null;
  dateJst: DateJst;
  interactive?: boolean;
  obstacles: readonly BoardObstacle[];
  rows: readonly BoardRow[];
};

type ConfirmTarget = {
  prefillMinutes: number | null;
  row: BoardRow;
};

//* 計測を捨てる操作は必ず Confirm を通す(docs/specs/study-timer.md §13.4)。
function requestDiscardMeasurement(options: {
  confirmColor: string;
  confirmLabel: string;
  measuredMinutes: number;
  onConfirm: () => void;
  suffix: string;
  title: string;
}): void {
  modals.openConfirmModal({
    children: `計測した${String(options.measuredMinutes)}分は残りません。${options.suffix}`,
    confirmProps: { color: options.confirmColor },
    labels: { cancel: "キャンセル", confirm: options.confirmLabel },
    onConfirm: options.onConfirm,
    title: options.title,
  });
}

function RecordCard({
  disabled,
  dragHandleProps,
  onConfirm,
  onResume,
  onStop,
  row,
}: {
  disabled: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLElement> | undefined;
  onConfirm: () => void;
  onResume: () => void;
  onStop: () => void;
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

//* 進行中カラムの見出しに計測中の合計だけを添える。固定バーは置かない(#51 §13.3)。
function columnHeadingLabel(status: KanbanColumn, rows: readonly BoardRow[]): string {
  if (status !== "進行中") {
    return status;
  }
  const measuring = rows.find((row) => timerRunState(row.timer) === "計測中");
  if (measuring === undefined) {
    return status;
  }
  return `${status} · 計測 ${formatTimerClock(measuredMs(measuring.timer, serverNowMs()))}`;
}

export function BoardKanban({
  checkpointLabel,
  dateJst,
  interactive = true,
  obstacles,
  rows,
}: BoardKanbanProps) {
  const {
    onApplyOrder,
    onConfirm,
    onPause,
    onReopen,
    onResumeTimer,
    onSkip,
    onStart,
    onStopTimer,
    onUnconfirm,
    onUnskip,
  } = useBoardKanbanActions(dateJst);
  const { DragDropContext, Draggable, Droppable } = useDnd();
  const grouped = groupRowsByKanbanColumn(rows);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
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

  //* 確定は「先にサーバで区間を閉じる → 真値をモーダルに出す → 人が押した値を保存する」の順(§11.2)。
  async function requestConfirm(row: BoardRow) {
    const accumulatedMs = hasTimerState(row.timer) ? await onStopTimer(row._id) : null;
    if (needsKanbanConfirmEditor(row) || accumulatedMs !== null) {
      setConfirmTarget({
        prefillMinutes: accumulatedMs === null ? null : timerMinutes(accumulatedMs),
        row,
      });
      return;
    }
    await onConfirm({ content: row.content, minutes: row.minutes, rowId: row._id });
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

    const measuredMinutes = timerMinutes(measuredMs(row.timer, serverNowMs()));
    const discardsMeasurement = hasTimerState(row.timer);

    if (statusMove === "confirm") {
      await requestConfirm(row);
    } else if (statusMove === "skip") {
      if (discardsMeasurement) {
        requestDiscardMeasurement({
          confirmColor: "yellow",
          confirmLabel: "見送りにする",
          measuredMinutes,
          onConfirm: () => void onSkip({ rowId: row._id }),
          suffix: "学習量からは外れます。",
          title: "見送りにしますか？",
        });
      } else {
        await onSkip({ rowId: row._id });
      }
    } else if (statusMove === "unskip") {
      await onUnskip({ rowId: row._id });
    } else if (statusMove === "unconfirm") {
      await onUnconfirm({ rowId: row._id });
    } else if (statusMove === "start") {
      await onStart({ rowId: row._id });
    } else if (statusMove === "pause") {
      if (discardsMeasurement) {
        requestDiscardMeasurement({
          confirmColor: "red",
          confirmLabel: "捨てて戻す",
          measuredMinutes,
          onConfirm: () => void onPause({ rowId: row._id }),
          suffix: "",
          title: "計測を捨てて未着手に戻しますか？",
        });
      } else {
        await onPause({ rowId: row._id });
      }
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
          setConfirmTarget(null);
          pendingOrderRef.current = null;
        }}
        onConfirm={async (input) => {
          await onConfirm(input);
          await applyPendingOrder();
        }}
        opened={confirmTarget !== null}
        prefillMinutes={confirmTarget?.prefillMinutes ?? null}
        row={confirmTarget?.row ?? null}
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
                        {columnHeadingLabel(status, columnRows)}
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
                                disabled={!interactive}
                                dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                                onConfirm={() => void requestConfirm(row)}
                                onResume={() => void onResumeTimer({ rowId: row._id })}
                                onStop={() => void onStopTimer(row._id)}
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
