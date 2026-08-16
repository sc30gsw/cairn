import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { assertConcreteAction } from "../../lib/concreteAction";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function updateObstacle(
  ctx: MutationCtx,
  ownerId: string,
  args: { ifText: string; planId: Id<"obstaclePlans">; thenText: string },
): Promise<null> {
  //? 認可を先に確定させる。他人の planId を探る呼び出しに ValidationFailed で応答しない
  const plan = await ctx.db.get("obstaclePlans", args.planId);
  if (plan === null || plan.ownerId !== ownerId) {
    throwDomain(
      new NotFoundError({ message: "障害プランが見つかりません", resource: "障害プラン" }),
    );
  }
  const ifText = args.ifText.trim();
  const thenText = args.thenText.trim();
  if (ifText === "") {
    throwDomain(new ValidationFailedError({ message: "if は必須です" }));
  }
  assertConcreteAction(thenText);
  await ctx.db.patch("obstaclePlans", args.planId, {
    ifText,
    thenText,
  });
  return null;
}
