import type { FunctionReturnType } from "convex/server";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

type GoalList = FunctionReturnType<typeof api.queries.goals.list.list>;

export function useCreateGoal() {
  return useConvexMutation(api.mutations.goals.create.create);
}

export function useUpdateGoal() {
  const mutation = useConvexMutation(api.mutations.goals.update.update);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.goals.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.goals.list.list,
      {},
      current.map((goal: GoalList[number]) => {
        if (goal._id !== args.goalId) {
          return goal;
        }
        if (goal.type === "exam" && args.goal.type === "exam") {
          return { ...goal, ...args.goal };
        }
        if (goal.type === "mastery" && args.goal.type === "mastery") {
          return { ...goal, ...args.goal };
        }
        return goal;
      }),
    );
  });
}

export function useRemoveGoal() {
  const mutation = useConvexMutation(api.mutations.goals.remove.remove);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.goals.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.goals.list.list,
      {},
      current.filter(
        (goal: GoalList[number]) =>
          goal._id !== args.goalId &&
          (goal.type !== "mastery" || goal.parentGoalId !== args.goalId),
      ),
    );
  });
}

export function useSetGoalAchieved() {
  const mutation = useConvexMutation(api.mutations.goals.setAchieved.setAchieved);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.goals.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.goals.list.list,
      {},
      current.map((goal) =>
        goal._id === args.goalId && goal.type === "mastery"
          ? {
              ...goal,
              achievedAt: args.achievedAt,
              reflection: args.reflection === undefined ? goal.reflection : args.reflection,
            }
          : goal,
      ),
    );
  });
}

export function useSetExamResult() {
  const mutation = useConvexMutation(api.mutations.goals.setExamResult.setExamResult);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.goals.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.goals.list.list,
      {},
      current.map((goal) =>
        goal._id === args.goalId && goal.type === "exam" ? { ...goal, result: args.result } : goal,
      ),
    );
  });
}

export function useCreateObstacle() {
  return useConvexMutation(api.mutations.goals.createObstacle.createObstacle);
}

export function useUpdateObstacle() {
  const mutation = useConvexMutation(api.mutations.goals.updateObstacle.updateObstacle);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.goals.listObstacles.listObstacles, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.goals.listObstacles.listObstacles,
      {},
      current.map((obstacle) =>
        obstacle._id === args.planId
          ? { _id: obstacle._id, ifText: args.ifText, thenText: args.thenText }
          : obstacle,
      ),
    );
  });
}

export function useRemoveObstacle() {
  const mutation = useConvexMutation(api.mutations.goals.removeObstacle.removeObstacle);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.goals.listObstacles.listObstacles, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.goals.listObstacles.listObstacles,
      {},
      current.filter((obstacle) => obstacle._id !== args.planId),
    );
  });
}
