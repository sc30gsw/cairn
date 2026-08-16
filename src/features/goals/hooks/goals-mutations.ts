import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useSaveExamGoal() {
  return useConvexMutation(api.mutations.goals.saveExam.saveExam);
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
