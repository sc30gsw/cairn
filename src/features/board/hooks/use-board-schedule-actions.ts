import type { DateJst } from "~domain/jst";
import { todayJst } from "~domain/jst";

import {
  useBoardScheduleCreate,
  useBoardScheduleMove,
  useBoardScheduleRemove,
  useBoardScheduleUpdate,
} from "~/features/board/hooks/board-mutations";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";
import { runMutation } from "~/lib/run-mutation";

export function useBoardScheduleActions(anchorDateJst: DateJst, view: BoardScheduleView) {
  const today = todayJst();
  const createBlock = useBoardScheduleCreate(anchorDateJst, today, view);
  const updateBlock = useBoardScheduleUpdate(anchorDateJst, today, view);
  const removeBlock = useBoardScheduleRemove(anchorDateJst, view);
  const moveBlock = useBoardScheduleMove(anchorDateJst, view);

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
