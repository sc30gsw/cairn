import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type UpdateGoalInput = FunctionArgs<typeof api.mutations.goals.update.update>;
//? 達成日は省略すると達成取り消し。UI は「達成した / まだ」の2値しか渡さない
export type SetAchievedInput = FunctionArgs<typeof api.mutations.goals.setAchieved.setAchieved>;
export type SaveTargetInput = FunctionArgs<typeof api.mutations.targets.save.save>;
export type RemoveTargetInput = FunctionArgs<typeof api.mutations.targets.remove.remove>;
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
