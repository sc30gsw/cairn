import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { scheduleGoalSync } from "../calendarSync/scheduleSourceSync";
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
  //? 消した目標の予定を Google からも消す（対応表が残っていれば送信アクションが片付ける）
  await scheduleGoalSync(ctx, ownerId, [goal._id, ...children.map((child) => child._id)]);

  return children.length;
}
