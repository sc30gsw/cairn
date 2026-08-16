import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useExamGoal(todayJst: string) {
  return useSuspenseQuery(convexQuery(api.goals.getExam, { todayJst }));
}

export function useObstaclesList() {
  return useSuspenseQuery(convexQuery(api.goals.listObstacles, {}));
}
