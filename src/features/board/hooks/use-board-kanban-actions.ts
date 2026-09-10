import { Result } from "better-result";
import type { DateJst } from "~domain/jst";
import { hasTimerState, measuredMs, timerMinutes } from "~domain/rowTimer";

import { needsKanbanConfirmEditor } from "~/features/board/components/board-kanban-confirm-modal";
import {
  useBoardApplyRowOrder,
  useBoardConfirmRow,
  useBoardMoveAndApplyRowOrder,
  useBoardUnstartRow,
  useBoardReopenRow,
  useBoardResumeRowTimer,
  useBoardSkipRow,
  useBoardStartRow,
  useBoardStopRowTimer,
  useBoardUnconfirmRow,
  useBoardUnskipRow,
} from "~/features/board/hooks/board-mutations";
import type { KanbanStatusMove } from "~/features/board/lib/kanban-order";
import type { BoardRow } from "~/features/board/types/board";
import { useOptimisticFlagReview, useOptimisticUnflagReview } from "~/hooks/use-row-mutations";
import { useTodayJst } from "~/hooks/use-today-jst";
import { runMutation } from "~/lib/run-mutation";
import { serverNowMs } from "~/lib/server-clock";

export function useBoardKanbanActions(dateJst: DateJst) {
  const today = useTodayJst();
  const applyOrder = useBoardApplyRowOrder(dateJst, today);
  const moveAndApplyOrder = useBoardMoveAndApplyRowOrder(dateJst, today);
  const confirmRow = useBoardConfirmRow(dateJst, today);
  const skipRow = useBoardSkipRow(dateJst, today);
  const unskipRow = useBoardUnskipRow(dateJst, today);
  const unconfirmRow = useBoardUnconfirmRow(dateJst, today);
  const startRow = useBoardStartRow(dateJst, today);
  const pauseRow = useBoardUnstartRow(dateJst, today);
  const reopenRow = useBoardReopenRow(dateJst, today);
  const stopRowTimer = useBoardStopRowTimer(dateJst, today);
  const resumeRowTimer = useBoardResumeRowTimer(dateJst, today);
  const flagReview = useOptimisticFlagReview(dateJst, today);
  const unflagReview = useOptimisticUnflagReview(dateJst, today);

  function onStopTimer(rowId: Parameters<typeof stopRowTimer.mutateAsync>[0]["rowId"]) {
    return runMutation(() => stopRowTimer.mutateAsync({ rowId }));
  }

  const onConfirm = (input: Parameters<typeof confirmRow.mutateAsync>[0]) =>
    runMutation(() => confirmRow.mutateAsync(input), {
      successMessage: `学習時間 ${String(input.minutes)}分を記録しました`,
    });
  const onSkip = (input: Parameters<typeof skipRow.mutateAsync>[0], successMessage?: string) =>
    runMutation(() => skipRow.mutateAsync(input), { successMessage });
  const onUnconfirm = (input: Parameters<typeof unconfirmRow.mutateAsync>[0]) =>
    runMutation(() => unconfirmRow.mutateAsync(input), {
      successMessage: "確定を取り消しました",
    });
  const onUnskip = (input: Parameters<typeof unskipRow.mutateAsync>[0]) =>
    runMutation(() => unskipRow.mutateAsync(input));
  const onStart = (input: Parameters<typeof startRow.mutateAsync>[0]) =>
    runMutation(() => startRow.mutateAsync(input));
  const onUnstart = (input: Parameters<typeof pauseRow.mutateAsync>[0], successMessage?: string) =>
    runMutation(() => pauseRow.mutateAsync(input), { successMessage });
  const onReopen = (input: Parameters<typeof reopenRow.mutateAsync>[0]) =>
    runMutation(() => reopenRow.mutateAsync(input));

  return {
    today,
    onFlagReview: (row: BoardRow, dueJst: DateJst) =>
      runMutation(() => flagReview.mutateAsync({ dueJst, rowId: row._id, todayJst: today }), {
        successMessage: `復習に回しました（${dueJst}）`,
      }),
    onUnflagReview: (row: BoardRow) =>
      runMutation(() => unflagReview.mutateAsync({ rowId: row._id }), {
        successMessage: "復習をやめました",
      }),
    onStopTimer,
    onConfirm,
    onSkip,
    onUnconfirm,
    onUnskip,
    onStart,
    onUnstart,
    onReopen,
    onStatusMove: async (
      move: KanbanStatusMove,
      row: BoardRow,
      openConfirmEditor: (args: { prefillMinutes: number | null; row: BoardRow }) => void,
      orderedRowIds?: BoardRow["_id"][],
    ) => {
      switch (move) {
        case "confirm": {
          if (hasTimerState(row.timer)) {
            if (orderedRowIds !== undefined && orderedRowIds.length > 0) {
              const localMinutes = timerMinutes(measuredMs(row.timer, serverNowMs()));
              return await runMutation(
                () =>
                  moveAndApplyOrder.mutateAsync({
                    dateJst,
                    move: { content: row.content, kind: "confirm" },
                    orderedRowIds,
                    rowId: row._id,
                  }),
                {
                  successMessage: (minutes) =>
                    `学習時間 ${String(minutes ?? localMinutes)}分を記録しました`,
                },
              );
            }
            const stopped = await onStopTimer(row._id);
            if (Result.isError(stopped)) return stopped;
            return await onConfirm({
              content: row.content,
              minutes: timerMinutes(stopped.value),
              rowId: row._id,
            });
          }
          if (needsKanbanConfirmEditor(row)) {
            openConfirmEditor({ prefillMinutes: null, row });
            return;
          }
          return await onConfirm({ content: row.content, minutes: row.minutes, rowId: row._id });
        }
        case "skip":
          return await onSkip({ rowId: row._id });
        case "unskip":
          return await onUnskip({ rowId: row._id });
        case "unconfirm":
          return await onUnconfirm({ rowId: row._id });
        case "start":
          return await onStart({ rowId: row._id });
        case "unstart":
          return await onUnstart({ rowId: row._id });
        case "reopen":
          return await onReopen({ rowId: row._id });
        case "noop":
          return;
      }
    },
    onResumeTimer: (input: Parameters<typeof resumeRowTimer.mutateAsync>[0]) =>
      runMutation(() => resumeRowTimer.mutateAsync(input)),
    onApplyOrder: (input: Parameters<typeof applyOrder.mutateAsync>[0]) =>
      runMutation(() => applyOrder.mutateAsync(input)),
    onMoveAndApplyOrder: (
      input: Parameters<typeof moveAndApplyOrder.mutateAsync>[0],
      successMessage?: string,
    ) => runMutation(() => moveAndApplyOrder.mutateAsync(input), { successMessage }),
  };
}
