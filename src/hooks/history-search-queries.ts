import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useOptionalHistorySearchLiveQuery } from "~/lib/tanstack-db/collections";

export function useHistorySearch(query: string, fromJst: DateJst | undefined) {
  const live = useOptionalHistorySearchLiveQuery({ fromJst, query });
  const queryResult = useSuspenseQuery(
    convexQuery(api.queries.history.search.search, { fromJst, query }),
  );
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
