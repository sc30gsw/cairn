import { BoardSchedule } from "~/features/board/components/board-schedule";
import { boardShimmerRows } from "~/features/board/lib/board-shimmer-template";

export function BoardSchedulePending() {
  return <BoardSchedule blocks={[]} checkpoint={null} pending rows={boardShimmerRows} />;
}
