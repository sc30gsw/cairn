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
import type { GoalFormOutput } from "~/features/goals/schemas/goal-schema";
import type { GoalId } from "~/features/goals/types/goal";
import type {
  CreateObstacleInput,
  RemoveObstacleInput,
  SaveTargetInput,
  SetAchievedInput,
  UpdateGoalInput,
  UpdateObstacleInput,
} from "~/features/goals/types/mutations";
import type { TargetId } from "~/features/goals/types/target";
import { runMutation } from "~/lib/run-mutation";

export function useGoalsBoardActions() {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const removeGoal = useRemoveGoal();
  const setAchieved = useSetGoalAchieved();
  const createObstacle = useCreateObstacle();
  const updateObstacle = useUpdateObstacle();
  const removeObstacle = useRemoveObstacle();

  return {
    onCreateGoal: (goal: GoalFormOutput) =>
      runMutation(() => createGoal.mutateAsync({ goal }), {
        successMessage: "目標を追加しました",
      }).then(() => undefined),
    onCreateObstacle: (input: CreateObstacleInput) =>
      runMutation(() => createObstacle.mutateAsync(input), {
        successMessage: "障害プランを追加しました",
      }).then(() => undefined),
    onRemoveGoal: (goalId: GoalId) =>
      runMutation(() => removeGoal.mutateAsync({ goalId }), {
        successMessage: "目標を削除しました",
      }).then(() => undefined),
    onRemoveObstacle: (planId: RemoveObstacleInput["planId"]) =>
      runMutation(() => removeObstacle.mutateAsync({ planId }), {
        successMessage: "障害プランを削除しました",
      }).then(() => undefined),
    onSetAchieved: (input: SetAchievedInput) =>
      runMutation(() => setAchieved.mutateAsync(input), {
        successMessage: input.achievedAt === undefined ? "達成を取り消しました" : "達成にしました",
      }).then(() => undefined),
    onUpdateGoal: (input: UpdateGoalInput) =>
      runMutation(() => updateGoal.mutateAsync(input), {
        successMessage: "目標を更新しました",
      }).then(() => undefined),
    onUpdateObstacle: (input: UpdateObstacleInput) =>
      runMutation(() => updateObstacle.mutateAsync(input), {
        successMessage: "障害プランを更新しました",
      }).then(() => undefined),
  };
}

export function useWeeklyTargetActions() {
  const saveTarget = useSaveTarget();
  const removeTarget = useRemoveTarget();

  return {
    onRemoveTarget: (targetId: TargetId) =>
      runMutation(() => removeTarget.mutateAsync({ targetId }), {
        successMessage: "週間ターゲットを削除しました",
      }).then(() => undefined),
    onSaveTarget: (input: SaveTargetInput) =>
      runMutation(() => saveTarget.mutateAsync(input), {
        successMessage: "週間ターゲットを保存しました",
      }).then(() => undefined),
  };
}
