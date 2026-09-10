import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";
import { useOptionalRecentConcreteActionsLiveQuery } from "~/lib/tanstack-db/collections";

export function useRecentConcreteActions({ itemId }: Record<"itemId", Id<"items">>) {
  const live = useOptionalRecentConcreteActionsLiveQuery({ itemId });
  const queryResult = useSuspenseQuery(
    convexQuery(api.queries.items.recentConcreteActions.recentConcreteActions, { itemId }),
  );
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
