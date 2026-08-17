import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useCreateGoal() {
  return useConvexMutation(api.mutations.goals.create.create);
}

export function useUpdateGoal() {
  return useConvexMutation(api.mutations.goals.update.update);
}

export function useRemoveGoal() {
  return useConvexMutation(api.mutations.goals.remove.remove);
}

export function useSetVolumeProgress() {
  return useConvexMutation(api.mutations.goals.setVolumeProgress.setVolumeProgress);
}

export function useEnsureWeekSnapshot() {
  return useConvexMutation(api.mutations.goals.ensureWeekSnapshot.ensureWeekSnapshot);
}

export function useSaveWeeklyGoal() {
  return useConvexMutation(api.mutations.goals.saveWeekly.saveWeekly);
}

export function useCreateObstacle() {
  return useConvexMutation(api.mutations.goals.createObstacle.createObstacle);
}

export function useUpdateObstacle() {
  return useConvexMutation(api.mutations.goals.updateObstacle.updateObstacle);
}

export function useRemoveObstacle() {
  return useConvexMutation(api.mutations.goals.removeObstacle.removeObstacle);
}
