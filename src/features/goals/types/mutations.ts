import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type SaveExamInput = FunctionArgs<typeof api.mutations.goals.saveExam.saveExam>;
export type SaveWeeklyInput = Pick<
  FunctionArgs<typeof api.mutations.goals.saveWeekly.saveWeekly>,
  "minutes"
>["minutes"];
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
