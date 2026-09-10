import { useSuspenseQueries } from "@tanstack/react-query";
import { Suspense } from "react";
import { mondayOfWeek } from "~domain/jst";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import { GoalsPending } from "~/features/goals/components/goals-pending";
import { goalsListQuery, obstaclesListQuery } from "~/hooks/goals-queries";
import { targetsWithProgressQuery } from "~/hooks/targets-queries";
import { categoriesListQuery } from "~/hooks/use-categories-list";
import { itemsListQuery } from "~/hooks/use-items-list";
import { useTodayJst } from "~/hooks/use-today-jst";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";
import {
  useOptionalCategoriesLiveQuery,
  useOptionalGoalsLiveQuery,
  useOptionalItemsLiveQuery,
  useOptionalObstaclesLiveQuery,
  useOptionalTargetsWithProgressLiveQuery,
} from "~/lib/tanstack-db/collections";

export function GoalsPage() {
  return (
    <Suspense fallback={<GoalsPending />}>
      <GoalsReady />
    </Suspense>
  );
}

function GoalsReady() {
  const today = useTodayJst();
  const weekStart = mondayOfWeek(today);
  const liveCategories = useOptionalCategoriesLiveQuery();
  const liveGoals = useOptionalGoalsLiveQuery();
  const liveItems = useOptionalItemsLiveQuery();
  const liveObstacles = useOptionalObstaclesLiveQuery();
  const liveTargets = useOptionalTargetsWithProgressLiveQuery(weekStart);
  const [
    { data: queriedCategories },
    { data: queriedGoals },
    { data: queriedItems },
    { data: queriedObstacles },
    { data: queriedTargets },
  ] = useSuspenseQueries({
    queries: [
      parallelConvexQuery(categoriesListQuery()),
      parallelConvexQuery(goalsListQuery()),
      parallelConvexQuery(itemsListQuery()),
      parallelConvexQuery(obstaclesListQuery()),
      parallelConvexQuery(targetsWithProgressQuery(weekStart)),
    ],
  });

  return (
    <GoalsBoard
      categories={
        liveCategories.isReady && liveCategories.data !== undefined
          ? liveCategories.data
          : queriedCategories
      }
      goals={liveGoals.isReady && liveGoals.data !== undefined ? liveGoals.data : queriedGoals}
      items={liveItems.isReady && liveItems.data !== undefined ? liveItems.data : queriedItems}
      obstacles={
        liveObstacles.isReady && liveObstacles.data !== undefined
          ? liveObstacles.data
          : queriedObstacles
      }
      targets={
        liveTargets.isReady && liveTargets.data !== undefined ? liveTargets.data : queriedTargets
      }
      todayJst={today}
    />
  );
}
