import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

//? カテゴリー一覧は catalog と goals の両方が読む。features 間 import を避けてここに置く
export function useCategoriesList() {
  return useSuspenseQuery(convexQuery(api.queries.categories.list.list, {}));
}
