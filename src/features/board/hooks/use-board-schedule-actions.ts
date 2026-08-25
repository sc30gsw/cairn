import type { DateJst } from "~domain/jst";

import {
  useBoardScheduleCreate,
  useBoardScheduleMove,
  useBoardScheduleRemove,
  useBoardScheduleUpdate,
} from "~/features/board/hooks/board-mutations";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";
import { useTodayJst } from "~/hooks/use-today-jst";
import { runMutation } from "~/lib/run-mutation";

//* ボードでは Toast を一切出さない。結果は予定ブロックの見た目にそのまま現れる(オーナー決定 2026-08-24)。
const silent = { silent: true } as const;

export function useBoardScheduleActions(anchorDateJst: DateJst, view: BoardScheduleView) {
  const today = useTodayJst();
  const createBlock = useBoardScheduleCreate(anchorDateJst, today, view);
  const updateBlock = useBoardScheduleUpdate(anchorDateJst, today, view);
  const removeBlock = useBoardScheduleRemove(anchorDateJst, view);
  const moveBlock = useBoardScheduleMove(anchorDateJst, view);

  return {
    onCreateBlock: (input: Parameters<typeof createBlock.mutateAsync>[0]) =>
      runMutation(() => createBlock.mutateAsync(input), silent).then(() => undefined),
    onMoveBlock: (input: Parameters<typeof moveBlock.mutateAsync>[0]) =>
      runMutation(() => moveBlock.mutateAsync(input), silent).then(() => undefined),
    onRemoveBlock: (input: Parameters<typeof removeBlock.mutateAsync>[0]) =>
      runMutation(() => removeBlock.mutateAsync(input), silent).then(() => undefined),
    onUpdateBlock: (input: Parameters<typeof updateBlock.mutateAsync>[0]) =>
      runMutation(() => updateBlock.mutateAsync(input), silent).then(() => undefined),
  };
}
