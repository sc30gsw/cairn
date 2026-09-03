import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

//? コマンドパレットから使う横断検索。features 配下ではなく共有側に置く
//? （src/components/** は features を import できない）
export function useHistorySearch(query: string, fromJst: DateJst | undefined) {
  return useSuspenseQuery(convexQuery(api.queries.history.search.search, { fromJst, query }));
}
