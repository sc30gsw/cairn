import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type CreateGoalInput = FunctionArgs<typeof api.mutations.goals.create.create>;
//? フォームが onSubmit で渡す形。ブランド付き Id を持つのでそのまま mutation に流せる(CVX-16)
export type GoalInputPayload = CreateGoalInput["goal"];
export type UpdateGoalInput = FunctionArgs<typeof api.mutations.goals.update.update>;
//? 達成日は省略すると達成取り消し。UI は「達成した / まだ」の2値しか渡さない
export type SetAchievedInput = FunctionArgs<typeof api.mutations.goals.setAchieved.setAchieved>;
export type SaveTargetInput = FunctionArgs<typeof api.mutations.targets.save.save>;
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
