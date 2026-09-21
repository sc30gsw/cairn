import { api } from "~/../convex/_generated/api";
import { optimisticId } from "~/lib/optimistic-id";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useCreateObstacle() {
  const mutation = useConvexMutation(api.mutations.goals.createObstacle.createObstacle);
  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.goals.listObstacles.listObstacles, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(api.queries.goals.listObstacles.listObstacles, {}, [
      ...current,
      {
        _id: optimisticId("obstaclePlans"),
        ifText: args.ifText.trim(),
        thenText: args.thenText.trim(),
      },
    ]);
  });
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
