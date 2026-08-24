import { BoardSchedule } from "~/features/board/components/board-schedule";
import { useBoardScheduleBlocks } from "~/features/board/hooks/board-queries";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

export function BoardScheduleTab() {
  const view = useBoardView();
  const { data: day } = useOpenAndLoadDay(view.selectedDateJst, view.today);
  const { data: blocks } = useBoardScheduleBlocks(view.scheduleAnchor, view.scheduleView);

  return <BoardSchedule blocks={blocks} rows={day.rows} view={view} />;
}
