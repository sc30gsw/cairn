import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { useOptionalCategoriesLiveQuery } from "~/lib/tanstack-db/collections";

export function categoriesListQuery() {
  return convexQuery(api.queries.categories.list.list, {});
}

export function useCategoriesList() {
  const live = useOptionalCategoriesLiveQuery();
  const queryResult = useSuspenseQuery(categoriesListQuery());
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
