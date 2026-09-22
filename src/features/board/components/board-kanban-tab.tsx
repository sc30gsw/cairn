import { BoardKanban } from "~/features/board/components/board-kanban";
import { BoardKanbanDateNavigation } from "~/features/board/components/board-kanban-date-navigation";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { planWindowLabelByRowId } from "~/features/board/lib/plan-window-by-row";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";
import { useOptionalPlanEventsLiveQuery } from "~/lib/tanstack-db/collections";

export function BoardKanbanTab() {
  const { selectedDateJst, today } = useBoardView();
  const { data: day } = useOpenAndLoadDay(selectedDateJst, today);
  const live = useOptionalPlanEventsLiveQuery({
    anchorDateJst: selectedDateJst,
    sort: "time",
    view: "day",
  });
  const windowsByRowId = planWindowLabelByRowId(live.isReady ? (live.data ?? []) : []);

  return (
    <>
      <BoardKanbanDateNavigation />
      <BoardKanban dateJst={selectedDateJst} rows={day.rows} windowsByRowId={windowsByRowId} />
    </>
  );
}
