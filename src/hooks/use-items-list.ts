import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

//? 項目一覧は catalog / today / goals の3つが読む。features 間 import を避けてここに置く
//? (use-categories-list.ts と同じ扱い)。各 feature の hooks はこれに委譲する。
export function useItemsList() {
  return useSuspenseQuery(convexQuery(api.queries.items.list.list, {}));
}
