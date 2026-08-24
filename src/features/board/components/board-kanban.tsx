import type { DropResult } from "@hello-pangea/dnd";
import { ActionIcon, Badge, Box, Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconGripVertical } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { DateJst } from "~domain/jst";
import { hasTimerState, measuredMs, timerMinutes, timerRunState } from "~domain/rowTimer";

import { TruncatedText } from "~/components/truncated-text";
import { BoardKanbanCardMenu } from "~/features/board/components/board-kanban-card-menu";
import { BoardKanbanConfirmModal } from "~/features/board/components/board-kanban-confirm-modal";
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
  prefillMinutes: number | null;
  row: BoardRow;
};

//* 計測を捨てる操作は必ず Confirm を通す(docs/specs/study-timer.md §13.4)。
function requestDiscardMeasurement(options: {
  confirmColor: string;
  confirmLabel: string;
  measuredMinutes: number;
  onCancel: () => void;
  onConfirm: () => void;
  suffix: string;
  title: string;
}): void {
  modals.openConfirmModal({
    children: `計測した${String(options.measuredMinutes)}分は残りません。${options.suffix}`,
    confirmProps: { color: options.confirmColor },
    labels: { cancel: "キャンセル", confirm: options.confirmLabel },
    onCancel: options.onCancel,
    onConfirm: options.onConfirm,
    title: options.title,
  });
}

function RecordCard({
  disabled,
  dragHandleProps,
  onConfirm,
  onResume,
  onShift,
  onStatusMove,
  onStop,
  row,
  rows,
}: {
  disabled: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLElement> | undefined;
  onConfirm: () => void;
  onResume: () => void;
  onShift: (direction: -1 | 1, row: BoardRow) => void;
  //? 戻り値は読まない(保留したかどうかを気にするのはドラッグ経路だけ)。
  onStatusMove: (move: Exclude<KanbanStatusMove, "noop">, row: BoardRow) => Promise<unknown>;
  onStop: () => void;
  row: BoardRow;
  rows: readonly BoardRow[];
}) {
  const badge = RECORD_STATUS_UI[row.status];
  const detail = row.content === "" ? row.category : `${row.category} · ${row.content}`;

  return (
    <Card padding="sm" withBorder>
      <Group align="flex-start" gap="xs" wrap="nowrap">
        {/*? 掴み手は DOM から消さない。dragHandleProps が実 DOM に付いていることが Draggable の前提で、
             条件分岐で外すと警告が出る。visibleFrom は CSS クラスなので DOM は残る(#58 §11.2) */}
        <Box visibleFrom="md">
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
        </Box>
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
        <BoardKanbanCardMenu
          disabled={disabled}
          onShift={onShift}
          onStatusMove={onStatusMove}
          row={row}
          rows={rows}
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

export function BoardKanban({ dateJst, interactive = true, rows }: BoardKanbanProps) {
  const { onApplyOrder, onConfirm, onPause, onResumeTimer, onSkip, onStatusMove, onStopTimer } =
    useBoardKanbanActions(dateJst);
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

  //* ドラッグ経路とメニュー経路の唯一の合流点。判定と確定手順はフック側(onStatusMove)にあり、
  //? ここが持つのは「計測を捨てる操作の Confirm」だけ(#51 §13.4 をどちらの経路でも通すため)。
  //? 戻り値の true は「モーダルを開いて保留した」。ドラッグ経路はそのとき並べ替えを確定させず、
  //? pendingOrderRef に預ける — 取り消されたら並べ替えも起きなかったことにする。
  async function moveRow(move: Exclude<KanbanStatusMove, "noop">, row: BoardRow): Promise<boolean> {
    if ((move === "skip" || move === "pause") && hasTimerState(row.timer)) {
      const measuredMinutes = timerMinutes(measuredMs(row.timer, serverNowMs()));
      requestDiscardMeasurement({
        confirmColor: move === "skip" ? "yellow" : "red",
        confirmLabel: move === "skip" ? "見送りにする" : "捨てて戻す",
        measuredMinutes,
        onCancel: () => {
          pendingOrderRef.current = null;
        },
        onConfirm: () => {
          void (async () => {
            await (move === "skip" ? onSkip({ rowId: row._id }) : onPause({ rowId: row._id }));
            await applyPendingOrder();
          })();
        },
        suffix: move === "skip" ? "学習量からは外れます。" : "",
        title: move === "skip" ? "見送りにしますか？" : "計測を捨てて未着手に戻しますか？",
      });
      return true;
    }
    let deferred = false;
    await onStatusMove(move, row, (target) => {
      deferred = true;
      setConfirmTarget(target);
    });
    return deferred;
  }

  //* 進行中カラムの計測チップからの確定も、必ず同じ合流点を通す。
  async function requestConfirm(row: BoardRow) {
    await onStatusMove("confirm", row, setConfirmTarget);
  }

  function shiftRow(direction: -1 | 1, row: BoardRow) {
    const orderedRowIds = shiftRowWithinColumn(rows, row._id, direction);
    if (orderedRowIds === null) {
      return;
    }
    void onApplyOrder({ dateJst, orderedRowIds });
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

    //? モーダルが開いたら並べ替えはまだ確定させない。取り消されれば並べ替えも起きなかったことになる。
    if (statusMove !== "noop" && (await moveRow(statusMove, row))) {
      return;
    }

    await applyPendingOrder();
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
        {/*? モバイルは横スナップで1画面1列。名前付き section にして支援技術から列の束と分かるようにする */}
        <section aria-label="カンバンの列" className={classes.columns}>
          {KANBAN_COLUMNS.map((status) => {
            const columnRows = grouped[status];
            return (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <Stack
                    aria-label={`${status} ${String(columnRows.length)}件`}
                    className={classes.column}
                    gap="xs"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <Group gap="xs" wrap="nowrap">
                      <Tooltip label={statusTooltip(status)} withArrow>
                        <Text fw={600} size="sm">
                          {columnHeadingLabel(status, columnRows)}
                        </Text>
                      </Tooltip>
                      <Badge color="gray" size="sm" variant="light">
                        {columnRows.length}
                      </Badge>
                    </Group>
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
                                onShift={shiftRow}
                                onStatusMove={moveRow}
                                onStop={() => void onStopTimer(row._id)}
                                row={row}
                                rows={rows}
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
