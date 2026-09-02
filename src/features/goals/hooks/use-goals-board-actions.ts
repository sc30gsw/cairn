import {
  useCreateGoal,
  useCreateObstacle,
  useRemoveGoal,
  useRemoveObstacle,
  useSetExamResult,
  useSetGoalAchieved,
  useUpdateGoal,
  useUpdateObstacle,
} from "~/features/goals/hooks/goals-mutations";
import { useRemoveTarget, useSaveTarget } from "~/features/goals/hooks/targets-mutations";
import { EXAM_RESULT_RECORDED_MESSAGE } from "~/features/goals/lib/exam-result-copy";
import { GOAL_UPDATED_MESSAGE } from "~/features/goals/lib/goal-tier-transition";
import type { GoalId } from "~/features/goals/types/goal";
import type {
  CreateObstacleInput,
  GoalInputPayload,
  RemoveObstacleInput,
  SaveTargetInput,
  SetAchievedInput,
  SetExamResultInput,
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
  const setExamResult = useSetExamResult();
  const createObstacle = useCreateObstacle();
  const updateObstacle = useUpdateObstacle();
  const removeObstacle = useRemoveObstacle();

  return {
    onCreateGoal: (goal: GoalInputPayload) =>
      runMutation(() => createGoal.mutateAsync({ goal }), {
        successMessage: "目標を追加しました",
      }).then(() => undefined),
    onCreateObstacle: (input: CreateObstacleInput) =>
      runMutation(() => createObstacle.mutateAsync(input), {
        successMessage: "障害プランを追加しました",
      }).then(() => undefined),
    onRemoveGoal: (goalId: GoalId) =>
      runMutation(() => removeGoal.mutateAsync({ goalId }), {
        successMessage: (removedChildren) =>
          removedChildren === 0
            ? "目標を削除しました"
            : `目標とチェックポイント${String(removedChildren)}件を削除しました`,
      }).then(() => undefined),
    onRemoveObstacle: (planId: RemoveObstacleInput["planId"]) =>
      runMutation(() => removeObstacle.mutateAsync({ planId }), {
        successMessage: "障害プランを削除しました",
      }).then(() => undefined),
    onSetAchieved: (input: SetAchievedInput) =>
      runMutation(() => setAchieved.mutateAsync(input), {
        successMessage: input.achievedAt === undefined ? "達成を取り消しました" : "達成にしました",
      }).then(() => undefined),
    onSetExamResult: (
      input: SetExamResultInput,
      successMessage: string = EXAM_RESULT_RECORDED_MESSAGE,
    ) =>
      runMutation(() => setExamResult.mutateAsync(input), { successMessage }).then(() => undefined),
    onUpdateGoal: (input: UpdateGoalInput, successMessage: string = GOAL_UPDATED_MESSAGE) =>
      runMutation(() => updateGoal.mutateAsync(input), { successMessage }).then(() => undefined),
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
