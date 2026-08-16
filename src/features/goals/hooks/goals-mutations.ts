import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useSaveExamGoal() {
  return useConvexMutation(api.goals.saveExam);
}

export function useSaveWeeklyGoal() {
  return useConvexMutation(api.goals.saveWeekly);
}

export function useCreateObstacle() {
  return useConvexMutation(api.goals.createObstacle);
}

export function useUpdateObstacle() {
  return useConvexMutation(api.goals.updateObstacle);
}

export function useRemoveObstacle() {
  return useConvexMutation(api.goals.removeObstacle);
}
