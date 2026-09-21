import {
  useCreateObstacle,
  useRemoveObstacle,
  useUpdateObstacle,
} from "~/hooks/obstacle-mutations";
import { runMutation } from "~/lib/run-mutation";
import type {
  CreateObstacleInput,
  RemoveObstacleInput,
  UpdateObstacleInput,
} from "~/types/obstacle";

export function useObstacleActions() {
  const createObstacle = useCreateObstacle();
  const updateObstacle = useUpdateObstacle();
  const removeObstacle = useRemoveObstacle();

  return {
    onCreateObstacle: (input: CreateObstacleInput) =>
      runMutation(() => createObstacle.mutateAsync(input), {
        successMessage: "障害プランを追加しました",
      }),
    onRemoveObstacle: (planId: RemoveObstacleInput["planId"]) =>
      runMutation(() => removeObstacle.mutateAsync({ planId }), {
        successMessage: "障害プランを削除しました",
      }),
    onUpdateObstacle: (input: UpdateObstacleInput) =>
      runMutation(() => updateObstacle.mutateAsync(input), {
        successMessage: "障害プランを更新しました",
      }),
  };
}
