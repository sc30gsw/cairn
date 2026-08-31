import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedLane } from "./helpers";

export async function removeLane(
  ctx: MutationCtx,
  ownerId: string,
  args: { laneId: Id<"methodLanes"> },
): Promise<null> {
  await requireOwnedLane(ctx, ownerId, args.laneId);
  //? 残存有無だけ知りたいので先頭1件で判定する(CVX-11)。カテゴリ削除の項目ガードと同じ規則。
  const methodInLane = await ctx.db
    .query("methods")
    .withIndex("by_lane_and_sortOrder", (q) => q.eq("laneId", args.laneId))
    .first();
  if (methodInLane !== null) {
    throwDomain(new ConflictError({ message: "方法が残っているレーンは消せません" }));
  }
  await ctx.db.delete("methodLanes", args.laneId);
  return null;
}
