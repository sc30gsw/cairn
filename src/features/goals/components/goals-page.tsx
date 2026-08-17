import { Suspense } from "react";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import { GoalsPending } from "~/features/goals/components/goals-pending";
import {
  useCreateGoal,
  useCreateObstacle,
  useRemoveGoal,
  useRemoveObstacle,
  useSaveWeeklyGoal,
  useSetVolumeProgress,
  useUpdateGoal,
  useUpdateObstacle,
} from "~/features/goals/hooks/goals-mutations";
import {
  useGoalsList,
  useObstaclesList,
  useWeeklyTrend,
} from "~/features/goals/hooks/goals-queries";
import { useRemoveTarget, useSaveTarget } from "~/features/goals/hooks/targets-mutations";
import { useTargetsWithProgress } from "~/features/goals/hooks/targets-queries";
import { useWeekSnapshot } from "~/features/goals/hooks/use-week-snapshot";
import { useHistoryWeek } from "~/features/history/hooks/history-queries";
import { useCategoriesList } from "~/hooks/use-categories-list";
import { runMutation } from "~/lib/run-mutation";
import { minutesByDateFromRows } from "~/lib/weekly-progress";

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
  const { data: week } = useHistoryWeek(today);
  const { data: obstacles } = useObstaclesList();
  const { data: targets } = useTargetsWithProgress(weekStart);
  const { data: trendWeeks } = useWeeklyTrend(today);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const removeGoal = useRemoveGoal();
  const setVolumeProgress = useSetVolumeProgress();
  const saveWeekly = useSaveWeeklyGoal();
  const createObstacle = useCreateObstacle();
  const updateObstacle = useUpdateObstacle();
  const removeObstacle = useRemoveObstacle();
  const saveTarget = useSaveTarget();
  const removeTarget = useRemoveTarget();

  useWeekSnapshot(weekStart);

  return (
    <GoalsBoard
      goals={goals}
      minutesByDate={minutesByDateFromRows(week.events)}
      obstacles={obstacles}
      onCreateGoal={(goal) => {
        void runMutation(() => createGoal.mutateAsync({ goal, weekStartJst: weekStart }), {
          successMessage: "目標を追加しました",
        });
      }}
      onCreateObstacle={(input) => {
        void runMutation(() => createObstacle.mutateAsync(input), {
          successMessage: "障害プランを追加しました",
        });
      }}
      onRemoveGoal={(goalId) => {
        void runMutation(() => removeGoal.mutateAsync({ goalId }), {
          successMessage: "目標を削除しました",
        });
      }}
      onRemoveObstacle={(planId) => {
        void runMutation(() => removeObstacle.mutateAsync({ planId }), {
          successMessage: "障害プランを削除しました",
        });
      }}
      onSaveWeekly={(input) => {
        void runMutation(() => saveWeekly.mutateAsync({ ...input, weekStartJst: weekStart }), {
          successMessage: "週間ゴールを保存しました",
        });
      }}
      onSetVolumeProgress={(input) => {
        void runMutation(() => setVolumeProgress.mutateAsync(input), {
          successMessage: "進捗を更新しました",
        });
      }}
      onUpdateGoal={(input) => {
        void runMutation(() => updateGoal.mutateAsync({ ...input, weekStartJst: weekStart }), {
          successMessage: "目標を更新しました",
        });
      }}
      onUpdateObstacle={(input) => {
        void runMutation(() => updateObstacle.mutateAsync(input), {
          successMessage: "障害プランを更新しました",
        });
      }}
      todayJst={today}
      trendWeeks={trendWeeks}
      weekEndJst={week.weekEnd}
      weeklyGoal={week.weeklyGoal}
      weeklyTargets={{
        categories,
        onRemoveTarget: (targetId) => {
          void runMutation(() => removeTarget.mutateAsync({ targetId }), {
            successMessage: "週間ターゲットを削除しました",
          });
        },
        onSaveTarget: (input) => {
          void runMutation(() => saveTarget.mutateAsync(input), {
            successMessage: "週間ターゲットを保存しました",
          });
        },
        targets,
      }}
    />
  );
}
