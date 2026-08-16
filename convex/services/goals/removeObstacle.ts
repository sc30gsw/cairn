import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function removeObstacle(
  ctx: MutationCtx,
  ownerId: string,
  args: { planId: Id<"obstaclePlans"> },
): Promise<null> {
  const plan = await ctx.db.get("obstaclePlans", args.planId);
  if (plan === null || plan.ownerId !== ownerId) {
    throwDomain(
      new NotFoundError({ message: "障害プランが見つかりません", resource: "障害プラン" }),
    );
  }
  await ctx.db.delete("obstaclePlans", args.planId);
  return null;
}
