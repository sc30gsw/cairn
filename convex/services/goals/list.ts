import type { QueryCtx } from "../../_generated/server";
import type { GoalDto } from "../../lib/validators";
import { toGoalDto } from "./toGoalDto";

//? 1所有者の目標は数件〜数十件。by_owner_and_type で所有者に絞ってから collect(CVX-11)。
//? 学習量の実績は保存値を読むだけ。rows/days は読まないので、記録の書き込みで再実行されない。
export async function list(ctx: QueryCtx, ownerId: string): Promise<GoalDto[]> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId))
    .collect();
  return goals.map(toGoalDto);
}
