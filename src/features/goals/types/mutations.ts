import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type SaveExamInput = FunctionArgs<typeof api.goals.saveExam>;
export type SaveWeeklyInput = Pick<FunctionArgs<typeof api.goals.saveWeekly>, "minutes">["minutes"];
export type CreateObstacleInput = FunctionArgs<typeof api.goals.createObstacle>;
export type UpdateObstacleInput = FunctionArgs<typeof api.goals.updateObstacle>;
export type RemoveObstacleInput = Pick<FunctionArgs<typeof api.goals.removeObstacle>, "planId">;
