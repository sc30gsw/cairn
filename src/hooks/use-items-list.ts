import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { useOptionalItemsLiveQuery } from "~/lib/tanstack-db/collections";

export function itemsListQuery() {
  return convexQuery(api.queries.items.list.list, {});
}

export function useItemsList() {
  const live = useOptionalItemsLiveQuery();
  const queryResult = useSuspenseQuery(itemsListQuery());
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
