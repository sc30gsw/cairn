import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedGoal } from "./requireOwnedGoal";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { goalId: Id<"goals"> },
): Promise<null> {
  const goal = await requireOwnedGoal(ctx, ownerId, args.goalId);
  await ctx.db.delete("goals", goal._id);
  return null;
}
