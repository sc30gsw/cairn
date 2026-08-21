import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useOpenAndLoadDay } from "~/features/today/hooks/use-open-and-load-day";

export function useBoardDay(dateJst: DateJst, todayJst: DateJst) {
  return useOpenAndLoadDay(dateJst, todayJst);
}

export function useBoardGoals() {
  return useSuspenseQuery(convexQuery(api.queries.goals.list.list, {}));
}

export function useBoardObstacles() {
  return useSuspenseQuery(convexQuery(api.queries.goals.listObstacles.listObstacles, {}));
}
