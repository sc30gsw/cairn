import { BoardSchedule } from "~/features/board/components/board-schedule";
import { boardShimmerRows } from "~/features/board/lib/board-shimmer-template";

export function BoardSchedulePending() {
  return (
    <BoardSchedule
      blocks={[]}
      checkpoint={null}
      onCreateBlock={async () => undefined}
      onMoveBlock={async () => undefined}
      onRemoveBlock={async () => undefined}
      onUpdateBlock={async () => undefined}
      pending
      rows={boardShimmerRows}
    />
  );
}
