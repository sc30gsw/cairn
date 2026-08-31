import type { QueryCtx } from "../../_generated/server";
import type { GoalDto } from "../../lib/validators";
import { toGoalDto } from "./toGoalDto";

export async function list(ctx: QueryCtx, ownerId: string): Promise<GoalDto[]> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId))
    .collect();
  return goals.map(toGoalDto);
}
