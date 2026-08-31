import { applyLaneOrderToList, applyMethodOrderToList } from "~domain/methodOrder";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useCreateLane() {
  return useConvexMutation(api.mutations.methods.createLane.createLane);
}

export function useRenameLane() {
  return useConvexMutation(api.mutations.methods.renameLane.renameLane);
}

export function useRemoveLane() {
  return useConvexMutation(api.mutations.methods.removeLane.removeLane);
}

export function useCreateMethod() {
  return useConvexMutation(api.mutations.methods.createMethod.createMethod);
}

export function useUpdateMethod() {
  return useConvexMutation(api.mutations.methods.updateMethod.updateMethod);
}

export function useRemoveMethod() {
  return useConvexMutation(api.mutations.methods.removeMethod.removeMethod);
}

export function useSetNowViewing() {
  return useConvexMutation(api.mutations.methods.setNowViewing.setNowViewing);
}

export function useApplyLaneOrder() {
  const mutation = useConvexMutation(api.mutations.methods.applyLaneOrder.applyLaneOrder);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.methods.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.methods.list.list,
      {},
      { lanes: applyLaneOrderToList(current.lanes, args.orderedLaneIds), methods: current.methods },
    );
  });
}

export function useApplyMethodOrder() {
  const mutation = useConvexMutation(api.mutations.methods.applyMethodOrder.applyMethodOrder);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.methods.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.methods.list.list,
      {},
      { lanes: current.lanes, methods: applyMethodOrderToList(current.methods, args.updates) },
    );
  });
}
