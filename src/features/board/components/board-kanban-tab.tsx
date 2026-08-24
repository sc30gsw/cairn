import { BoardKanban } from "~/features/board/components/board-kanban";
import { BoardKanbanDateNavigation } from "~/features/board/components/board-kanban-date-navigation";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

export function BoardKanbanTab() {
  const { selectedDateJst, today } = useBoardView();
  const { data: day } = useOpenAndLoadDay(selectedDateJst, today);

  return (
    <>
      <BoardKanbanDateNavigation />
      <BoardKanban dateJst={selectedDateJst} rows={day.rows} />
    </>
  );
}
