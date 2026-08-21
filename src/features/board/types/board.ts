import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type BoardDayPage = FunctionReturnType<typeof api.queries.days.get.get>;
export type BoardRow = BoardDayPage["rows"][number];
export type BoardGoal = FunctionReturnType<typeof api.queries.goals.list.list>[number];
export type BoardObstacle = FunctionReturnType<
  typeof api.queries.goals.listObstacles.listObstacles
>[number];
export type BoardMastery = Extract<BoardGoal, { type: "mastery" }>;
