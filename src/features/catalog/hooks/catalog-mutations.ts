import { applyItemOrderToList, applyRenameToList } from "~domain/itemOrder";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useCreateCategory() {
  return useConvexMutation(api.categories.create);
}

export function useRenameCategory() {
  return useConvexMutation(api.categories.rename);
}

export function useRemoveCategory() {
  return useConvexMutation(api.categories.remove);
}

export function useCreateItem() {
  return useConvexMutation(api.items.create);
}

export function useRemoveItem() {
  return useConvexMutation(api.items.remove);
}

export function useApplyItemOrder() {
  const mutation = useConvexMutation(api.items.applyOrder);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.items.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(api.items.list, {}, applyItemOrderToList(current, args.updates));
  });
}

export function useRenameItem() {
  const mutation = useConvexMutation(api.items.rename);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.items.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(api.items.list, {}, applyRenameToList(current, args));
  });
}

export function useCreatePreset() {
  return useConvexMutation(api.presets.create);
}

export function useUpdatePreset() {
  return useConvexMutation(api.presets.update);
}

export function useRemovePreset() {
  return useConvexMutation(api.presets.remove);
}
