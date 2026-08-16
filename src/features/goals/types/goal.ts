import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type ExamGoal = FunctionReturnType<typeof api.queries.goals.getExam.getExam>;
export type Obstacle = FunctionReturnType<
  typeof api.queries.goals.listObstacles.listObstacles
>[number];
export type WeeklyTrendWeeks = FunctionReturnType<
  typeof api.queries.goals.weeklyTrend.weeklyTrend
>;
