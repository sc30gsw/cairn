import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function getConnection(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<Doc<"calendarConnections"> | null> {
  return await ctx.db
    .query("calendarConnections")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
}
