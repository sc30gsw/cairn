import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type UpdateGoalInput = FunctionArgs<typeof api.mutations.goals.update.update>;
export type SetVolumeProgressInput = FunctionArgs<
  typeof api.mutations.goals.setVolumeProgress.setVolumeProgress
>;
//? 週の指定はページ側が持つので、フォームは days / dailyFloorMinutes だけを渡す
export type SaveWeeklyInput = Omit<
  FunctionArgs<typeof api.mutations.goals.saveWeekly.saveWeekly>,
  "weekStartJst"
>;
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
