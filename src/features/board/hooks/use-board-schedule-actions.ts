import type { DateJst } from "~domain/jst";
import { todayJst } from "~domain/jst";

import {
  useBoardScheduleCreate,
  useBoardScheduleMove,
  useBoardScheduleRemove,
  useBoardScheduleUpdate,
} from "~/features/board/hooks/board-mutations";
import { runMutation } from "~/lib/run-mutation";

export function useBoardScheduleActions(anchorDateJst: DateJst) {
  const today = todayJst();
  const createBlock = useBoardScheduleCreate(anchorDateJst, today);
  const updateBlock = useBoardScheduleUpdate(anchorDateJst, today);
  const removeBlock = useBoardScheduleRemove(anchorDateJst);
  const moveBlock = useBoardScheduleMove(anchorDateJst);

  return {
    onCreateBlock: (input: Parameters<typeof createBlock.mutateAsync>[0]) =>
      runMutation(() => createBlock.mutateAsync(input), {
        successMessage: "予定を追加しました",
      }).then(() => undefined),
    onMoveBlock: (input: Parameters<typeof moveBlock.mutateAsync>[0]) =>
      runMutation(() => moveBlock.mutateAsync(input), {
        successMessage: "予定を移動しました",
      }).then(() => undefined),
    onRemoveBlock: (input: Parameters<typeof removeBlock.mutateAsync>[0]) =>
      runMutation(() => removeBlock.mutateAsync(input), {
        successMessage: "予定を削除しました",
      }).then(() => undefined),
    onUpdateBlock: (input: Parameters<typeof updateBlock.mutateAsync>[0]) =>
      runMutation(() => updateBlock.mutateAsync(input), {
        successMessage: "予定を更新しました",
      }).then(() => undefined),
  };
}
