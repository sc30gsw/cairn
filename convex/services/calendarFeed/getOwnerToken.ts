import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function getOwnerToken(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<Doc<"calendarFeedTokens"> | null> {
  return await ctx.db
    .query("calendarFeedTokens")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
}
