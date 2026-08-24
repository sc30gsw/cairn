import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { listChildCheckpoints } from "./listChildCheckpoints";
import { requireOwnedGoal } from "./requireOwnedGoal";

//* 目標を消す。週間ターゲット(プロセス目標)とはデータ上独立なので、他のテーブルには波及しない。
//? 親を消すと子チェックポイントも消える(INV-6)。同一トランザクションで全削除する(CVX-15)。
//? 返り値はカスケードで消えた子の件数。トーストの文言に使う。
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
