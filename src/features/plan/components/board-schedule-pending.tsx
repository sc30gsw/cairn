import { BoardSchedule } from "~/features/plan/components/board-schedule";
import { usePlanView } from "~/features/plan/hooks/use-plan-view";

export function BoardSchedulePending() {
  const view = usePlanView();

  return <BoardSchedule blocks={[]} items={[]} pending view={view} />;
}
