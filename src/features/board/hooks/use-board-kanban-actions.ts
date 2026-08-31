import type { DateJst } from "~domain/jst";
import { hasTimerState, timerMinutes } from "~domain/rowTimer";

import { needsKanbanConfirmEditor } from "~/features/board/components/board-kanban-confirm-modal";
import {
  useBoardApplyRowOrder,
  useBoardConfirmRow,
  useBoardPauseRow,
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
import { useTodayJst } from "~/hooks/use-today-jst";
import { runMutation } from "~/lib/run-mutation";

const silent = { silent: true } as const;

export function useBoardKanbanActions(dateJst: DateJst) {
  const today = useTodayJst();
  const applyOrder = useBoardApplyRowOrder(dateJst, today);
  const confirmRow = useBoardConfirmRow(dateJst, today);
  const skipRow = useBoardSkipRow(dateJst, today);
  const unskipRow = useBoardUnskipRow(dateJst, today);
  const unconfirmRow = useBoardUnconfirmRow(dateJst, today);
  const startRow = useBoardStartRow(dateJst, today);
  const pauseRow = useBoardPauseRow(dateJst, today);
  const reopenRow = useBoardReopenRow(dateJst, today);
  const stopRowTimer = useBoardStopRowTimer(dateJst, today);
  const resumeRowTimer = useBoardResumeRowTimer(dateJst, today);

  async function onStopTimer(rowId: Parameters<typeof stopRowTimer.mutateAsync>[0]["rowId"]) {
    let accumulatedMs: number | null = null;
    await runMutation(async () => {
      accumulatedMs = await stopRowTimer.mutateAsync({ rowId });
    }, silent);
    return accumulatedMs;
  }

  const onConfirm = (input: Parameters<typeof confirmRow.mutateAsync>[0]) =>
    runMutation(() => confirmRow.mutateAsync(input), {
      silent: true,
      successMessage: `学習時間 ${String(input.minutes)}分を記録しました`,
    }).then(() => undefined);
  const onSkip = (input: Parameters<typeof skipRow.mutateAsync>[0], successMessage?: string) =>
    runMutation(() => skipRow.mutateAsync(input), { silent: true, successMessage }).then(
      () => undefined,
    );
  const onUnconfirm = (input: Parameters<typeof unconfirmRow.mutateAsync>[0]) =>
    runMutation(() => unconfirmRow.mutateAsync(input), {
      silent: true,
      successMessage: "確定を取り消しました",
    }).then(() => undefined);
  const onUnskip = (input: Parameters<typeof unskipRow.mutateAsync>[0]) =>
    runMutation(() => unskipRow.mutateAsync(input), silent).then(() => undefined);
  const onStart = (input: Parameters<typeof startRow.mutateAsync>[0]) =>
    runMutation(() => startRow.mutateAsync(input), silent).then(() => undefined);
  const onPause = (input: Parameters<typeof pauseRow.mutateAsync>[0], successMessage?: string) =>
    runMutation(() => pauseRow.mutateAsync(input), { silent: true, successMessage }).then(
      () => undefined,
    );
  const onReopen = (input: Parameters<typeof reopenRow.mutateAsync>[0]) =>
    runMutation(() => reopenRow.mutateAsync(input), silent).then(() => undefined);

  return {
    onStopTimer,
    onConfirm,
    onSkip,
    onUnconfirm,
    onUnskip,
    onStart,
    onPause,
    onReopen,
    onStatusMove: async (
      move: KanbanStatusMove,
      row: BoardRow,
      openConfirmEditor: (args: { prefillMinutes: number | null; row: BoardRow }) => void,
    ) => {
      switch (move) {
        case "confirm": {
          if (hasTimerState(row.timer)) {
            const accumulatedMs = await onStopTimer(row._id);
            if (accumulatedMs === null) {
              openConfirmEditor({ prefillMinutes: null, row });
              return;
            }
            return await onConfirm({
              content: row.content,
              minutes: timerMinutes(accumulatedMs),
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
        case "pause":
          return await onPause({ rowId: row._id });
        case "reopen":
          return await onReopen({ rowId: row._id });
        case "noop":
          return;
      }
    },
    onResumeTimer: (input: Parameters<typeof resumeRowTimer.mutateAsync>[0]) =>
      runMutation(() => resumeRowTimer.mutateAsync(input), silent).then(() => undefined),
    onApplyOrder: (input: Parameters<typeof applyOrder.mutateAsync>[0]) =>
      runMutation(() => applyOrder.mutateAsync(input), silent).then(() => undefined),
  };
}
