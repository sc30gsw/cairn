import { Shimmer } from "@shimmer-from-structure/react";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import {
  goalsShimmerExam,
  goalsShimmerObstacles,
  goalsShimmerTodayJst,
  goalsShimmerTrendWeeks,
  goalsShimmerVolumeMinutes,
  goalsShimmerWeekEndJst,
  goalsShimmerWeeklyGoalMinutes,
} from "~/features/goals/lib/goals-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function GoalsPending() {
  return (
    <Shimmer loading>
      <GoalsBoard
        exam={goalsShimmerExam}
        obstacles={goalsShimmerObstacles}
        onCreateObstacle={shimmerNoop}
        onRemoveObstacle={shimmerNoop}
        onSaveExam={shimmerNoop}
        onSaveWeekly={shimmerNoop}
        onUpdateObstacle={shimmerNoop}
        todayJst={goalsShimmerTodayJst}
        trendWeeks={goalsShimmerTrendWeeks}
        volumeMinutes={goalsShimmerVolumeMinutes}
        weekEndJst={goalsShimmerWeekEndJst}
        weeklyGoalMinutes={goalsShimmerWeeklyGoalMinutes}
      />
    </Shimmer>
  );
}
