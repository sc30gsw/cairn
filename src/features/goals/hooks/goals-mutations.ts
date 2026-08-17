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

//? 習得の達成は所有者の自己判定。学習量からは自動判定しない(CONTEXT.md「習得」)
export function useSetGoalAchieved() {
  return useConvexMutation(api.mutations.goals.setAchieved.setAchieved);
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
