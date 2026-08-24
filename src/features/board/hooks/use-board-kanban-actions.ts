import type { DateJst } from "~domain/jst";
import { todayJst } from "~domain/jst";

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

  return {
    //? 確定の直前にサーバで区間を閉じる。モーダルに出す分数はサーバ真値(#51 §8.3)。
    //? 失敗したら null を返し、呼び出し側は計測なしと同じ経路に落とす。
    onStopTimer: async (rowId: Parameters<typeof stopRowTimer.mutateAsync>[0]["rowId"]) => {
      let accumulatedMs: number | null = null;
      await runMutation(async () => {
        accumulatedMs = await stopRowTimer.mutateAsync({ rowId });
      });
      return accumulatedMs;
    },
    onResumeTimer: (input: Parameters<typeof resumeRowTimer.mutateAsync>[0]) =>
      runMutation(() => resumeRowTimer.mutateAsync(input)).then(() => undefined),
    onApplyOrder: (input: Parameters<typeof applyOrder.mutateAsync>[0]) =>
      runMutation(() => applyOrder.mutateAsync(input)).then(() => undefined),
    onConfirm: (input: Parameters<typeof confirmRow.mutateAsync>[0]) =>
      runMutation(() => confirmRow.mutateAsync(input)).then(() => undefined),
    onSkip: (input: Parameters<typeof skipRow.mutateAsync>[0]) =>
      runMutation(() => skipRow.mutateAsync(input)).then(() => undefined),
    onUnconfirm: (input: Parameters<typeof unconfirmRow.mutateAsync>[0]) =>
      runMutation(() => unconfirmRow.mutateAsync(input)).then(() => undefined),
    onUnskip: (input: Parameters<typeof unskipRow.mutateAsync>[0]) =>
      runMutation(() => unskipRow.mutateAsync(input)).then(() => undefined),
    onStart: (input: Parameters<typeof startRow.mutateAsync>[0]) =>
      runMutation(() => startRow.mutateAsync(input)).then(() => undefined),
    onPause: (input: Parameters<typeof pauseRow.mutateAsync>[0]) =>
      runMutation(() => pauseRow.mutateAsync(input)).then(() => undefined),
    onReopen: (input: Parameters<typeof reopenRow.mutateAsync>[0]) =>
      runMutation(() => reopenRow.mutateAsync(input)).then(() => undefined),
  };
}
