import type { DateJst } from "~domain/jst";

import {
  useBoardExternalMove,
  useBoardExternalRemove,
  useBoardScheduleCreate,
  useBoardScheduleMove,
  useBoardScheduleRemove,
  useBoardScheduleUpdate,
} from "~/features/board/hooks/board-mutations";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";
import { useTodayJst } from "~/hooks/use-today-jst";
import { runMutation } from "~/lib/run-mutation";

const silent = { silent: true } as const;

export function useBoardScheduleActions(anchorDateJst: DateJst, view: BoardScheduleView) {
  const today = useTodayJst();
  const createBlock = useBoardScheduleCreate(anchorDateJst, today, view);
  const updateBlock = useBoardScheduleUpdate(anchorDateJst, today, view);
  const removeBlock = useBoardScheduleRemove(anchorDateJst, view);
  const moveBlock = useBoardScheduleMove(anchorDateJst, view);
  const moveExternal = useBoardExternalMove(anchorDateJst, view);
  const removeExternal = useBoardExternalRemove(anchorDateJst, view);

  return {
    onCreateBlock: (input: Parameters<typeof createBlock.mutateAsync>[0]) =>
      runMutation(() => createBlock.mutateAsync(input), silent).then(() => undefined),
    onMoveBlock: (input: Parameters<typeof moveBlock.mutateAsync>[0]) =>
      runMutation(() => moveBlock.mutateAsync(input), silent).then(() => undefined),
    onMoveExternal: (input: Parameters<typeof moveExternal.mutateAsync>[0]) =>
      runMutation(() => moveExternal.mutateAsync(input), silent).then(() => undefined),
    onRemoveExternal: (input: Parameters<typeof removeExternal.mutateAsync>[0]) =>
      runMutation(() => removeExternal.mutateAsync(input), {
        successMessage: "Google カレンダーから予定を消しました",
      }).then(() => undefined),
    onRemoveBlock: (input: Parameters<typeof removeBlock.mutateAsync>[0]) =>
      runMutation(() => removeBlock.mutateAsync(input), silent).then(() => undefined),
    onUpdateBlock: (input: Parameters<typeof updateBlock.mutateAsync>[0]) =>
      runMutation(() => updateBlock.mutateAsync(input), silent).then(() => undefined),
  };
}
