import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { listChildCheckpoints } from "./listChildCheckpoints";
import { requireOwnedGoal } from "./requireOwnedGoal";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: Record<"goalId", Id<"goals">>,
): Promise<number> {
  const goal = await requireOwnedGoal(ctx, ownerId, args.goalId);
  const children = await listChildCheckpoints(ctx, ownerId, goal._id);
  await Promise.all(children.map((child) => ctx.db.delete("goals", child._id)));
  await ctx.db.delete("goals", goal._id);

  return children.length;
}
