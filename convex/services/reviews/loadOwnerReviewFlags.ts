import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

//? 所有者の復習の印は数件〜数十件。index で所有者に絞って全部読む（CVX-11）
export async function loadOwnerReviewFlags(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<Doc<"reviewFlags">[]> {
  return await ctx.db
    .query("reviewFlags")
    .withIndex("by_owner_and_dueJst", (q) => q.eq("ownerId", ownerId))
    .collect();
}
