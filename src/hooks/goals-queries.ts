import { convexQuery } from "@convex-dev/react-query";

import { api } from "~/../convex/_generated/api";

export function goalsListQuery() {
  return convexQuery(api.queries.goals.list.list, {});
}

export function obstaclesListQuery() {
  return convexQuery(api.queries.goals.listObstacles.listObstacles, {});
}
