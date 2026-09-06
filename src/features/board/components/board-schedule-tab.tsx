import { BoardSchedule } from "~/features/board/components/board-schedule";
import { useBoardScheduleBlocks } from "~/features/board/hooks/board-queries";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { useExternalCalendarEvents, useSyncCalendarOnOpen } from "~/hooks/use-calendar-sync";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

export function BoardScheduleTab() {
  const view = useBoardView();
  const { data: day } = useOpenAndLoadDay(view.selectedDateJst, view.today);
  const { data: blocks } = useBoardScheduleBlocks(view.scheduleAnchor, view.scheduleView);
  const { data: externals } = useExternalCalendarEvents(view.scheduleAnchor, view.scheduleView);
  useSyncCalendarOnOpen();

  return <BoardSchedule blocks={blocks} externals={externals} rows={day.rows} view={view} />;
}
