import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

export function useGoalsList() {
  return useSuspenseQuery(convexQuery(api.queries.goals.list.list, {}));
}

export function useObstaclesList() {
  return useSuspenseQuery(convexQuery(api.queries.goals.listObstacles.listObstacles, {}));
}

export function useWeeklyTrend(todayJst: DateJst) {
  return useSuspenseQuery(convexQuery(api.queries.goals.weeklyTrend.weeklyTrend, { todayJst }));
}
