import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

export function useRecentConcreteActions({ itemId }: Record<"itemId", Id<"items">>) {
  return useSuspenseQuery(
    convexQuery(api.queries.items.recentConcreteActions.recentConcreteActions, { itemId }),
  );
}
