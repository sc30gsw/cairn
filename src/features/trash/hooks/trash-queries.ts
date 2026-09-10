import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { useOptionalTrashPageLiveQuery } from "~/lib/tanstack-db/collections";

export function useTrashList() {
  const live = useOptionalTrashPageLiveQuery();
  const queryResult = useSuspenseQuery(convexQuery(api.queries.trash.list.list, {}));
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
