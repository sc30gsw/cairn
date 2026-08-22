import type { DateJst } from "~domain/jst";
import { todayJst } from "~domain/jst";

import {
  useBoardApplyRowOrder,
  useBoardConfirmRow,
  useBoardPauseRow,
  useBoardReopenRow,
  useBoardSkipRow,
  useBoardStartRow,
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

  return {
    onApplyOrder: (input: Parameters<typeof applyOrder.mutateAsync>[0]) =>
      runMutation(() => applyOrder.mutateAsync(input), {
        successMessage: "並べ替えを保存しました",
      }).then(() => undefined),
    onConfirm: (input: Parameters<typeof confirmRow.mutateAsync>[0]) =>
      runMutation(() => confirmRow.mutateAsync(input), {
        successMessage: "記録を確定しました",
      }).then(() => undefined),
    onSkip: (input: Parameters<typeof skipRow.mutateAsync>[0]) =>
      runMutation(() => skipRow.mutateAsync(input), {
        successMessage: "スキップしました",
      }).then(() => undefined),
    onUnconfirm: (input: Parameters<typeof unconfirmRow.mutateAsync>[0]) =>
      runMutation(() => unconfirmRow.mutateAsync(input), {
        successMessage: "未着手に戻しました",
      }).then(() => undefined),
    onUnskip: (input: Parameters<typeof unskipRow.mutateAsync>[0]) =>
      runMutation(() => unskipRow.mutateAsync(input), {
        successMessage: "未着手に戻しました",
      }).then(() => undefined),
    onStart: (input: Parameters<typeof startRow.mutateAsync>[0]) =>
      runMutation(() => startRow.mutateAsync(input), {
        successMessage: "進行中にしました",
      }).then(() => undefined),
    onPause: (input: Parameters<typeof pauseRow.mutateAsync>[0]) =>
      runMutation(() => pauseRow.mutateAsync(input), {
        successMessage: "未着手に戻しました",
      }).then(() => undefined),
    onReopen: (input: Parameters<typeof reopenRow.mutateAsync>[0]) =>
      runMutation(() => reopenRow.mutateAsync(input), {
        successMessage: "進行中に戻しました",
      }).then(() => undefined),
  };
}
