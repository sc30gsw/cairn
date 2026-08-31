import { convexQuery } from "@convex-dev/react-query";

import { api } from "~/../convex/_generated/api";

//? 方法カタログを読むのはこの feature の Suspense 境界だけ。クエリファクトリが引数の SSoT。
export function methodCatalogQuery() {
  return convexQuery(api.queries.methods.list.list, {});
}
