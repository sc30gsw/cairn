import { Suspense } from "react";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import { GoalsPending } from "~/features/goals/components/goals-pending";
import { useTargetsWithProgress } from "~/features/goals/hooks/targets-queries";
import { useGoalsList, useObstaclesList } from "~/hooks/goals-queries";
import { useCategoriesList } from "~/hooks/use-categories-list";

export function GoalsPage() {
  return (
    <Suspense fallback={<GoalsPending />}>
      <GoalsReady />
    </Suspense>
  );
}

function GoalsReady() {
  const today = todayJst();
  const weekStart = mondayOfWeek(today);
  const { data: categories } = useCategoriesList();
  const { data: goals } = useGoalsList();
  const { data: obstacles } = useObstaclesList();
  const { data: targets } = useTargetsWithProgress(weekStart);

  return (
    <GoalsBoard
      categories={categories}
      goals={goals}
      obstacles={obstacles}
      targets={targets}
      todayJst={today}
    />
  );
}
