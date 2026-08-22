import { todayJst } from "~domain/jst";

import { BoardKanban } from "~/features/board/components/board-kanban";
import { nearestCheckpoint } from "~/features/board/lib/nearest-checkpoint";
import { useGoalsList, useObstaclesList } from "~/hooks/goals-queries";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

export function BoardKanbanTab() {
  const today = todayJst();
  const { data: day } = useOpenAndLoadDay(today, today);
  const { data: goals } = useGoalsList();
  const { data: obstacles } = useObstaclesList();
  const checkpoint = nearestCheckpoint(goals, today);
  const checkpointLabel =
    checkpoint === null
      ? null
      : checkpoint.deadline === undefined
        ? checkpoint.content
        : `${checkpoint.content}（${checkpoint.deadline}）`;

  return (
    <BoardKanban
      checkpointLabel={checkpointLabel}
      dateJst={today}
      obstacles={obstacles}
      rows={day.rows}
    />
  );
}
