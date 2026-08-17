import { Shimmer } from "@shimmer-from-structure/react";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import {
  goalsShimmerCategories,
  goalsShimmerGoals,
  goalsShimmerMinutesByDate,
  goalsShimmerObstacles,
  goalsShimmerTargets,
  goalsShimmerTodayJst,
  goalsShimmerTrendWeeks,
  goalsShimmerWeeklyGoal,
  goalsShimmerWeekEndJst,
} from "~/features/goals/lib/goals-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function GoalsPending() {
  return (
    <Shimmer loading>
      <GoalsBoard
        goals={goalsShimmerGoals}
        minutesByDate={goalsShimmerMinutesByDate}
        obstacles={goalsShimmerObstacles}
        onCreateGoal={shimmerNoop}
        onCreateObstacle={shimmerNoop}
        onRemoveGoal={shimmerNoop}
        onRemoveObstacle={shimmerNoop}
        onSaveWeekly={shimmerNoop}
        onSetVolumeProgress={shimmerNoop}
        onUpdateGoal={shimmerNoop}
        onUpdateObstacle={shimmerNoop}
        todayJst={goalsShimmerTodayJst}
        trendWeeks={goalsShimmerTrendWeeks}
        weekEndJst={goalsShimmerWeekEndJst}
        weeklyGoal={goalsShimmerWeeklyGoal}
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
