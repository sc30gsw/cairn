import { Shimmer } from "@shimmer-from-structure/react";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import {
  goalsShimmerCategories,
  goalsShimmerGoals,
  goalsShimmerObstacles,
  goalsShimmerTargets,
  goalsShimmerTodayJst,
} from "~/features/goals/lib/goals-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function GoalsPending() {
  return (
    <Shimmer loading>
      <GoalsBoard
        goals={goalsShimmerGoals}
        obstacles={goalsShimmerObstacles}
        onCreateGoal={shimmerNoop}
        onCreateObstacle={shimmerNoop}
        onRemoveGoal={shimmerNoop}
        onRemoveObstacle={shimmerNoop}
        onSetAchieved={shimmerNoop}
        onUpdateGoal={shimmerNoop}
        onUpdateObstacle={shimmerNoop}
        todayJst={goalsShimmerTodayJst}
        weeklyTargets={{
          categories: goalsShimmerCategories,
          onRemoveTarget: shimmerNoop,
          onSaveTarget: shimmerNoop,
          targets: goalsShimmerTargets,
        }}
      />
    </Shimmer>
  );
}
