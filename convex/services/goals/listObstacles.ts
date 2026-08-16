import type { QueryCtx } from "../../_generated/server";

export async function listObstacles(ctx: QueryCtx, ownerId: string) {
  const plans = await ctx.db
    .query("obstaclePlans")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  return plans.map((plan) => ({
    _id: plan._id,
    ifText: plan.ifText,
    thenText: plan.thenText,
  }));
}
