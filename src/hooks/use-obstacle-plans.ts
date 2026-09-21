import { useSuspenseQuery } from "@tanstack/react-query";

import { obstaclesListQuery } from "~/hooks/goals-queries";
import { useObstacleActions } from "~/hooks/use-obstacle-actions";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";
import { useOptionalObstaclesLiveQuery } from "~/lib/tanstack-db/collections";

export function useObstaclePlans() {
  const liveObstacles = useOptionalObstaclesLiveQuery();
  const { data: queriedObstacles } = useSuspenseQuery(parallelConvexQuery(obstaclesListQuery()));
  const actions = useObstacleActions();

  return {
    obstacles:
      liveObstacles.isReady && liveObstacles.data !== undefined
        ? liveObstacles.data
        : queriedObstacles,
    ...actions,
  };
}
