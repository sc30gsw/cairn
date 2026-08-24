import type { DateJst } from "~domain/jst";
import { todayJst } from "~domain/jst";
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
import { runMutation } from "~/lib/run-mutation";

export function useBoardKanbanActions(dateJst: DateJst) {
  const today = todayJst();
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

  //? 確定の直前にサーバで区間を閉じる。モーダルに出す分数はサーバ真値(#51 §8.3)。
  //? 失敗したら null を返し、呼び出し側は計測なしと同じ経路に落とす。
  async function onStopTimer(rowId: Parameters<typeof stopRowTimer.mutateAsync>[0]["rowId"]) {
    let accumulatedMs: number | null = null;
    await runMutation(async () => {
      accumulatedMs = await stopRowTimer.mutateAsync({ rowId });
    });
    return accumulatedMs;
  }

  const onConfirm = (input: Parameters<typeof confirmRow.mutateAsync>[0]) =>
    runMutation(() => confirmRow.mutateAsync(input)).then(() => undefined);
  const onSkip = (input: Parameters<typeof skipRow.mutateAsync>[0]) =>
    runMutation(() => skipRow.mutateAsync(input)).then(() => undefined);
  const onUnconfirm = (input: Parameters<typeof unconfirmRow.mutateAsync>[0]) =>
    runMutation(() => unconfirmRow.mutateAsync(input)).then(() => undefined);
  const onUnskip = (input: Parameters<typeof unskipRow.mutateAsync>[0]) =>
    runMutation(() => unskipRow.mutateAsync(input)).then(() => undefined);
  const onStart = (input: Parameters<typeof startRow.mutateAsync>[0]) =>
    runMutation(() => startRow.mutateAsync(input)).then(() => undefined);
  const onPause = (input: Parameters<typeof pauseRow.mutateAsync>[0]) =>
    runMutation(() => pauseRow.mutateAsync(input)).then(() => undefined);
  const onReopen = (input: Parameters<typeof reopenRow.mutateAsync>[0]) =>
    runMutation(() => reopenRow.mutateAsync(input)).then(() => undefined);

  return {
    onStopTimer,
    onConfirm,
    onSkip,
    onUnconfirm,
    onUnskip,
    onStart,
    onPause,
    onReopen,
    //* ドラッグ経路とメニュー経路の唯一の合流点(pwa-mobile.md §11.3)。確定の手順はここに1度だけ書く。
    //? モーダルを開く side effect は呼び出し側の state なので callback で受ける。
    onStatusMove: async (
      move: KanbanStatusMove,
      row: BoardRow,
      openConfirmEditor: (args: { prefillMinutes: number | null; row: BoardRow }) => void,
    ) => {
      switch (move) {
        case "confirm": {
          //? 先にサーバで区間を閉じる。目安分数のまま確定すると計測結果を捨てる(study-timer.md §11.3)。
          const accumulatedMs = hasTimerState(row.timer) ? await onStopTimer(row._id) : null;
          if (needsKanbanConfirmEditor(row) || accumulatedMs !== null) {
            openConfirmEditor({
              prefillMinutes: accumulatedMs === null ? null : timerMinutes(accumulatedMs),
              row,
            });
            return;
          }
          //? ここに来るのは「計測が無く、content と minutes が既に埋まっている行」だけ。
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
      runMutation(() => resumeRowTimer.mutateAsync(input)).then(() => undefined),
    onApplyOrder: (input: Parameters<typeof applyOrder.mutateAsync>[0]) =>
      runMutation(() => applyOrder.mutateAsync(input)).then(() => undefined),
  };
}
