import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function loadOwnerReviewFlags(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<Doc<"reviewFlags">[]> {
  return await ctx.db
    .query("reviewFlags")
    .withIndex("by_owner_and_dueJst", (q) => q.eq("ownerId", ownerId))
    .collect();
}
