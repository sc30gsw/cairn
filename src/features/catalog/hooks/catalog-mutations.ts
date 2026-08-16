import { applyItemOrderToList, applyRenameToList } from "~domain/itemOrder";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useCreateCategory() {
  return useConvexMutation(api.mutations.categories.create.create);
}

export function useRenameCategory() {
  return useConvexMutation(api.mutations.categories.rename.rename);
}

export function useRemoveCategory() {
  return useConvexMutation(api.mutations.categories.remove.remove);
}

export function useCreateItem() {
  return useConvexMutation(api.mutations.items.create.create);
}

export function useRemoveItem() {
  return useConvexMutation(api.mutations.items.remove.remove);
}

export function useApplyItemOrder() {
  const mutation = useConvexMutation(api.mutations.items.applyOrder.applyOrder);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.items.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(api.queries.items.list.list, {}, applyItemOrderToList(current, args.updates));
  });
}

export function useRenameItem() {
  const mutation = useConvexMutation(api.mutations.items.rename.rename);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.items.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(api.queries.items.list.list, {}, applyRenameToList(current, args));
  });
}

export function useCreatePreset() {
  return useConvexMutation(api.mutations.presets.create.create);
}

export function useUpdatePreset() {
  return useConvexMutation(api.mutations.presets.update.update);
}

export function useRemovePreset() {
  return useConvexMutation(api.mutations.presets.remove.remove);
}
