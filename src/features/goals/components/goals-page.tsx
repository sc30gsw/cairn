import { Suspense } from "react";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import { GoalsPending } from "~/features/goals/components/goals-pending";
import {
  useCreateGoal,
  useCreateObstacle,
  useRemoveGoal,
  useRemoveObstacle,
  useSetGoalAchieved,
  useUpdateGoal,
  useUpdateObstacle,
} from "~/features/goals/hooks/goals-mutations";
import { useRemoveTarget, useSaveTarget } from "~/features/goals/hooks/targets-mutations";
import { useTargetsWithProgress } from "~/features/goals/hooks/targets-queries";
import { useGoalsList, useObstaclesList } from "~/hooks/goals-queries";
import { useCategoriesList } from "~/hooks/use-categories-list";
import { runMutation } from "~/lib/run-mutation";

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
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const removeGoal = useRemoveGoal();
  const setAchieved = useSetGoalAchieved();
  const createObstacle = useCreateObstacle();
  const updateObstacle = useUpdateObstacle();
  const removeObstacle = useRemoveObstacle();
  const saveTarget = useSaveTarget();
  const removeTarget = useRemoveTarget();

  return (
    <GoalsBoard
      goals={goals}
      obstacles={obstacles}
      onCreateGoal={(goal) => {
        void runMutation(() => createGoal.mutateAsync({ goal }), {
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
      onSetAchieved={(input) => {
        void runMutation(() => setAchieved.mutateAsync(input), {
          successMessage:
            input.achievedAt === undefined ? "達成を取り消しました" : "達成にしました",
        });
      }}
      onUpdateGoal={(input) => {
        void runMutation(() => updateGoal.mutateAsync(input), {
          successMessage: "目標を更新しました",
        });
      }}
      onUpdateObstacle={(input) => {
        void runMutation(() => updateObstacle.mutateAsync(input), {
          successMessage: "障害プランを更新しました",
        });
      }}
      todayJst={today}
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
