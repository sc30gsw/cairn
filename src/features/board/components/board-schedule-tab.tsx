import { todayJst } from "~domain/jst";

import { BoardSchedule } from "~/features/board/components/board-schedule";
import { useBoardScheduleBlocks } from "~/features/board/hooks/board-queries";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { nearestCheckpoint } from "~/features/board/lib/nearest-checkpoint";
import { useGoalsList } from "~/hooks/goals-queries";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

export function BoardScheduleTab() {
  const today = todayJst();
  const { scheduleAnchor, scheduleView } = useBoardView();
  const { data: day } = useOpenAndLoadDay(today, today);
  const { data: goals } = useGoalsList();
  const { data: blocks } = useBoardScheduleBlocks(scheduleAnchor, scheduleView);
  const checkpoint = nearestCheckpoint(goals, today);

  return <BoardSchedule blocks={blocks} checkpoint={checkpoint} rows={day.rows} />;
}
