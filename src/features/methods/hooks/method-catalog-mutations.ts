import { applyLaneOrderToList, applyMethodOrderToList } from "~domain/methodOrder";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useCreateLane() {
  return useConvexMutation(api.mutations.methods.createLane.createLane);
}

export function useRenameLane() {
  const mutation = useConvexMutation(api.mutations.methods.renameLane.renameLane);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.methods.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.methods.list.list,
      {},
      {
        lanes: current.lanes.map((lane) =>
          lane._id === args.laneId ? { ...lane, name: args.name.trim() } : lane,
        ),
        methods: current.methods,
      },
    );
  });
}

export function useRemoveLane() {
  const mutation = useConvexMutation(api.mutations.methods.removeLane.removeLane);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.methods.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.methods.list.list,
      {},
      {
        lanes: current.lanes.filter((lane) => lane._id !== args.laneId),
        methods: current.methods.filter((method) => method.laneId !== args.laneId),
      },
    );
  });
}

export function useCreateMethod() {
  return useConvexMutation(api.mutations.methods.createMethod.createMethod);
}

export function useUpdateMethod() {
  const mutation = useConvexMutation(api.mutations.methods.updateMethod.updateMethod);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.methods.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.methods.list.list,
      {},
      {
        lanes: current.lanes,
        methods: current.methods.map((method) =>
          method._id === args.methodId
            ? {
                ...method,
                bodyText: args.bodyText,
                completionHtml: args.completionHtml,
                memoHtml: args.memoHtml,
                name: args.name.trim(),
              }
            : method,
        ),
      },
    );
  });
}

export function useRemoveMethod() {
  const mutation = useConvexMutation(api.mutations.methods.removeMethod.removeMethod);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.methods.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.methods.list.list,
      {},
      {
        lanes: current.lanes,
        methods: current.methods.filter((method) => method._id !== args.methodId),
      },
    );
  });
}

export function useSetNowViewing() {
  const mutation = useConvexMutation(api.mutations.methods.setNowViewing.setNowViewing);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.methods.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.methods.list.list,
      {},
      {
        lanes: current.lanes,
        methods: current.methods.map((method) => ({
          ...method,
          nowViewing: method._id === args.methodId ? args.nowViewing : false,
        })),
      },
    );
  });
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
