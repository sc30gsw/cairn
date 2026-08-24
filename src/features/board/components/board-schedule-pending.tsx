import { BoardSchedule } from "~/features/board/components/board-schedule";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { boardShimmerRows } from "~/features/board/lib/board-shimmer-template";

export function BoardSchedulePending() {
  const view = useBoardView();

  return <BoardSchedule blocks={[]} pending rows={boardShimmerRows} view={view} />;
}
