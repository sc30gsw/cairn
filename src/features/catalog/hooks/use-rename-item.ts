import { applyItemOrderToList, applyRenameToList } from "~domain/itemOrder";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

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
