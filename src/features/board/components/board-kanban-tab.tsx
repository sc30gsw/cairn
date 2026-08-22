import { BoardKanban } from "~/features/board/components/board-kanban";
import { BoardKanbanDateNavigation } from "~/features/board/components/board-kanban-date-navigation";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { nearestCheckpoint } from "~/features/board/lib/nearest-checkpoint";
import { useGoalsList, useObstaclesList } from "~/hooks/goals-queries";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

export function BoardKanbanTab() {
  const { selectedDateJst, today } = useBoardView();
  const { data: day } = useOpenAndLoadDay(selectedDateJst, today);
  const { data: goals } = useGoalsList();
  const { data: obstacles } = useObstaclesList();
  const checkpoint = nearestCheckpoint(goals, selectedDateJst);
  const checkpointLabel =
    checkpoint === null
      ? null
      : checkpoint.deadline === undefined
        ? checkpoint.content
        : `${checkpoint.content}（${checkpoint.deadline}）`;

  return (
    <>
      <BoardKanbanDateNavigation />
      <BoardKanban
        checkpointLabel={checkpointLabel}
        dateJst={selectedDateJst}
        obstacles={obstacles}
        rows={day.rows}
      />
    </>
  );
}
