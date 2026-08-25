import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

//? カテゴリー一覧は catalog と goals の両方が読む。features 間 import を避けてここに置く
//? 並列取得(useSuspenseQueries)側もこのファクトリを使う。
export function categoriesListQuery() {
  return convexQuery(api.queries.categories.list.list, {});
}

export function useCategoriesList() {
  return useSuspenseQuery(categoriesListQuery());
}
