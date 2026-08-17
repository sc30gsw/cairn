import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedGoal } from "./requireOwnedGoal";

//* 目標を消す。週間ターゲット(プロセス目標)とはデータ上独立なので、他のテーブルには波及しない。
export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: Record<"goalId", Id<"goals">>,
): Promise<null> {
  const goal = await requireOwnedGoal(ctx, ownerId, args.goalId);
  await ctx.db.delete("goals", goal._id);
  return null;
}
