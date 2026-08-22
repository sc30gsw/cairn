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
