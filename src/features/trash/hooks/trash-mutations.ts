import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useRestoreDay() {
  const mutation = useConvexMutation(api.mutations.trash.restoreDay.restoreDay);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.trash.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.trash.list.list,
      {},
      {
        days: current.days.filter((day) => day._id !== args.dayId),
        rows: current.rows.filter((row) => row.dayId !== args.dayId),
      },
    );
  });
}

export function useRestoreRow() {
  const mutation = useConvexMutation(api.mutations.rows.restore.restore);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.trash.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.trash.list.list,
      {},
      {
        days: current.days,
        rows: current.rows.filter((row) => row._id !== args.rowId),
      },
    );
  });
}

export function useRestoreMany() {
  return useConvexMutation(api.mutations.trash.restoreMany.restoreMany);
}

export function usePurgeDay() {
  const mutation = useConvexMutation(api.mutations.trash.purgeDay.purgeDay);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.trash.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.trash.list.list,
      {},
      {
        days: current.days.filter((day) => day._id !== args.dayId),
        rows: current.rows.filter((row) => row.dayId !== args.dayId),
      },
    );
  });
}

export function usePurgeRow() {
  const mutation = useConvexMutation(api.mutations.trash.purgeRow.purgeRow);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.trash.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.trash.list.list,
      {},
      {
        days: current.days,
        rows: current.rows.filter((row) => row._id !== args.rowId),
      },
    );
  });
}

export function usePurgeMany() {
  const mutation = useConvexMutation(api.mutations.trash.purgeMany.purgeMany);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.trash.list.list, {});
    if (current === undefined) {
      return;
    }
    const dayIds = new Set(args.dayIds);
    const rowIds = new Set(args.rowIds);
    localStore.setQuery(
      api.queries.trash.list.list,
      {},
      {
        days: current.days.filter((day) => !dayIds.has(day._id)),
        rows: current.rows.filter((row) => !dayIds.has(row.dayId) && !rowIds.has(row._id)),
      },
    );
  });
}
