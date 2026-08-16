import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { assertConcreteAction } from "../../lib/concreteAction";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function createObstacle(
  ctx: MutationCtx,
  ownerId: string,
  args: { ifText: string; thenText: string },
): Promise<Id<"obstaclePlans">> {
  const ifText = args.ifText.trim();
  const thenText = args.thenText.trim();
  if (ifText === "") {
    throwDomain(new ValidationFailedError({ message: "if は必須です" }));
  }
  assertConcreteAction(thenText);
  return await ctx.db.insert("obstaclePlans", {
    ifText,
    ownerId,
    thenText,
  });
}
