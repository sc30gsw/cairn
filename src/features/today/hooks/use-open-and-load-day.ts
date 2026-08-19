import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useOpenAndLoadDay(dateJst: DateJst, today: DateJst) {
  const open = useConvexMutation(api.mutations.days.open.open);

  // React throws away hook state when a component suspends before it mounts, so useState
  // cannot hold this promise: the query cache is what keeps `open` to a single call.
  useSuspenseQuery({
    gcTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      if (dateJst === today) {
        await open.mutateAsync({ dateJst, todayJst: today });
      }
      return null;
    },
    queryKey: ["days.open", dateJst, today],
    staleTime: Number.POSITIVE_INFINITY,
  });

  return useSuspenseQuery(convexQuery(api.queries.days.get.get, { dateJst, todayJst: today }));
}
