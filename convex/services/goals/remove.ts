import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedGoal } from "./requireOwnedGoal";

//* 目標だけを消す。今週の weeklyGoals スナップショットは意図的に残す。
//? 週の判定基準は週初のスナップショットで固定されるので、途中で目標を消しても今週の判定は動かさない。
export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { goalId: Id<"goals"> },
): Promise<null> {
  const goal = await requireOwnedGoal(ctx, ownerId, args.goalId);
  await ctx.db.delete("goals", goal._id);
  return null;
}
