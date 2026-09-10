import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useSaveTarget() {
  const mutation = useConvexMutation(api.mutations.targets.save.save);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const currentQueries = localStore.getAllQueries(
      api.queries.targets.listWithProgress.listWithProgress,
    );
    for (const query of currentQueries) {
      const updated = query.value?.map((target) =>
        target.categoryId === args.categoryId && target.metric === args.metric
          ? {
              ...target,
              achieved: target.current >= args.targetValue,
              metric: args.metric,
              targetValue: args.targetValue,
            }
          : target,
      );
      if (updated !== undefined) {
        localStore.setQuery(
          api.queries.targets.listWithProgress.listWithProgress,
          query.args,
          updated,
        );
      }
    }
  });
}

export function useRemoveTarget() {
  const mutation = useConvexMutation(api.mutations.targets.remove.remove);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const currentQueries = localStore.getAllQueries(
      api.queries.targets.listWithProgress.listWithProgress,
    );
    for (const query of currentQueries) {
      const updated = query.value?.filter((target) => target._id !== args.targetId);
      if (updated !== undefined) {
        localStore.setQuery(
          api.queries.targets.listWithProgress.listWithProgress,
          query.args,
          updated,
        );
      }
    }
  });
}
