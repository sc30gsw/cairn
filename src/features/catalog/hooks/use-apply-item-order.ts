import { useConvexMutation } from "@convex-dev/react-query";
import { applyItemOrderToList } from "~domain/itemOrder";

import { api } from "~/../convex/_generated/api";

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
