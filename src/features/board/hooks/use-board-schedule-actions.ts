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

const silent = { silent: true } as const satisfies NonNullable<Parameters<typeof runMutation>[1]>;

export function useBoardScheduleActions(anchorDateJst: DateJst, view: BoardScheduleView) {
  const today = useTodayJst();
  const createBlock = useBoardScheduleCreate();
  const updateBlock = useBoardScheduleUpdate(anchorDateJst, today, view);
  const removeBlock = useBoardScheduleRemove(anchorDateJst, view);
  const moveBlock = useBoardScheduleMove(anchorDateJst, view);
  const moveExternal = useBoardExternalMove();
  const removeExternal = useBoardExternalRemove();

  return {
    onCreateBlock: (input: Parameters<typeof createBlock.mutateAsync>[0]) =>
      runMutation(() => createBlock.mutateAsync(input), silent),
    onMoveBlock: (input: Parameters<typeof moveBlock.mutateAsync>[0]) =>
      runMutation(() => moveBlock.mutateAsync(input), silent),
    onMoveExternal: (input: Parameters<typeof moveExternal.mutateAsync>[0]) =>
      runMutation(() => moveExternal.mutateAsync(input), {
        successMessage: "Google カレンダーへの反映を送信しました",
      }),
    onRemoveExternal: (input: Parameters<typeof removeExternal.mutateAsync>[0]) =>
      runMutation(() => removeExternal.mutateAsync(input), {
        successMessage: "Google カレンダーからの削除を送信しました",
      }),
    onRemoveBlock: (input: Parameters<typeof removeBlock.mutateAsync>[0]) =>
      runMutation(() => removeBlock.mutateAsync(input), silent),
    onUpdateBlock: (input: Parameters<typeof updateBlock.mutateAsync>[0]) =>
      runMutation(() => updateBlock.mutateAsync(input), silent),
  };
}
