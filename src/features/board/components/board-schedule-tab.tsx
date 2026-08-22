import { BoardSchedule } from "~/features/board/components/board-schedule";
import { useBoardScheduleBlocks } from "~/features/board/hooks/board-queries";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { nearestCheckpoint } from "~/features/board/lib/nearest-checkpoint";
import { useGoalsList } from "~/hooks/goals-queries";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

export function BoardScheduleTab() {
  const view = useBoardView();
  const { data: day } = useOpenAndLoadDay(view.selectedDateJst, view.today);
  const { data: goals } = useGoalsList();
  const { data: blocks } = useBoardScheduleBlocks(view.scheduleAnchor, view.scheduleView);
  const checkpoint = nearestCheckpoint(goals, view.today);

  return <BoardSchedule blocks={blocks} checkpoint={checkpoint} rows={day.rows} view={view} />;
}
