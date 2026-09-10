import { convexQuery } from "@convex-dev/react-query";
import { usePrefetchQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useOptionalDayPageLiveQuery } from "~/lib/tanstack-db/collections";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function dayPageQueryOptions(dateJst: DateJst, todayJst: DateJst) {
  return convexQuery(api.queries.days.get.get, { dateJst, todayJst });
}

export function useEnsureDayOpen(dateJst: DateJst, today: DateJst) {
  const open = useConvexMutation(api.mutations.days.open.open);

  return useSuspenseQuery({
    gcTime: Number.POSITIVE_INFINITY,
    queryFn: () =>
      dateJst === today ? open.mutateAsync({ dateJst, todayJst: today }) : Promise.resolve(null),
    queryKey: ["days.open", dateJst, today],
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useOpenAndLoadDay(dateJst: DateJst, today: DateJst) {
  usePrefetchQuery(dayPageQueryOptions(dateJst, today));
  useEnsureDayOpen(dateJst, today);

  const liveDay = useOptionalDayPageLiveQuery({ dateJst, todayJst: today });
  const queryResult = useSuspenseQuery(dayPageQueryOptions(dateJst, today));

  return {
    ...queryResult,
    data: liveDay.isReady && liveDay.data !== undefined ? liveDay.data : queryResult.data,
  };
}
