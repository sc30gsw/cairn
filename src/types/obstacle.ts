import type { FunctionArgs, FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type Obstacle = FunctionReturnType<
  typeof api.queries.goals.listObstacles.listObstacles
>[number];

export type CreateObstacleInput = FunctionArgs<
  typeof api.mutations.goals.createObstacle.createObstacle
>;

export type UpdateObstacleInput = FunctionArgs<
  typeof api.mutations.goals.updateObstacle.updateObstacle
>;

export type RemoveObstacleInput = Pick<
  FunctionArgs<typeof api.mutations.goals.removeObstacle.removeObstacle>,
  "planId"
>;
