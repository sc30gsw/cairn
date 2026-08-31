import { convexQuery } from "@convex-dev/react-query";

import { api } from "~/../convex/_generated/api";

export function methodCatalogQuery() {
  return convexQuery(api.queries.methods.list.list, {});
}
