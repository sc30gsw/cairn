import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type Goal = FunctionReturnType<typeof api.queries.goals.list.list>[number];
export type GoalOfType<TType extends Goal["type"]> = Extract<Goal, Record<"type", TType>>;
export type ExamGoal = GoalOfType<"exam">;
export type PaceGoal = GoalOfType<"pace">;
export type VolumeGoal = GoalOfType<"volume">;
export type MasteryGoal = GoalOfType<"mastery">;
export type OtherGoal = GoalOfType<"other">;
export type GoalId = Goal["_id"];
export type Obstacle = FunctionReturnType<
  typeof api.queries.goals.listObstacles.listObstacles
>[number];
export type WeeklyTrendWeeks = FunctionReturnType<typeof api.queries.goals.weeklyTrend.weeklyTrend>;
export type WeeklyTrendWeek = WeeklyTrendWeeks[number];
