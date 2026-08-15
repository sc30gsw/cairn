import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type ExamGoal = FunctionReturnType<typeof api.goals.getExam>;
export type Obstacle = FunctionReturnType<typeof api.goals.listObstacles>[number];
