import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function categoriesListQuery() {
  return convexQuery(api.queries.categories.list.list, {});
}

export function useCategoriesList() {
  return useSuspenseQuery(categoriesListQuery());
}
