import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function itemsListQuery() {
  return convexQuery(api.queries.items.list.list, {});
}

export function useItemsList() {
  return useSuspenseQuery(itemsListQuery());
}
