import { Shimmer } from "@shimmer-from-structure/react";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import {
  goalsShimmerCategories,
  goalsShimmerGoals,
  goalsShimmerObstacles,
  goalsShimmerTargets,
  goalsShimmerTodayJst,
} from "~/features/goals/lib/goals-shimmer-template";

export function GoalsPending() {
  return (
    <Shimmer loading>
      <GoalsBoard
        categories={goalsShimmerCategories}
        goals={goalsShimmerGoals}
        obstacles={goalsShimmerObstacles}
        targets={goalsShimmerTargets}
        todayJst={goalsShimmerTodayJst}
      />
    </Shimmer>
  );
}
