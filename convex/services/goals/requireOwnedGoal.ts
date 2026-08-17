import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function requireOwnedGoal(ctx: MutationCtx, ownerId: string, goalId: Id<"goals">) {
  const goal = await ctx.db.get("goals", goalId);
  if (goal === null || goal.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "目標が見つかりません", resource: "目標" }));
  }
  return goal;
}
