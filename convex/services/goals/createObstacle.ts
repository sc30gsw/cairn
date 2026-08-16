import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

export async function createObstacle(
  ctx: MutationCtx,
  ownerId: string,
  args: { ifText: string; thenText: string },
): Promise<Id<"obstaclePlans">> {
  return await ctx.db.insert("obstaclePlans", {
    ifText: args.ifText,
    ownerId,
    thenText: args.thenText,
  });
}
