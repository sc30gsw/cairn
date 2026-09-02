import type { QueryCtx } from "../../_generated/server";
import type { PushSubscriptionDto } from "../../lib/validators";

export async function listPushSubscriptions(
  ctx: QueryCtx,
  ownerId: string,
): Promise<PushSubscriptionDto[]> {
  const rows = await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_owner_and_endpoint", (q) => q.eq("ownerId", ownerId))
    .collect();
  return rows.map((row) => ({
    _creationTime: row._creationTime,
    _id: row._id,
    endpoint: row.endpoint,
  }));
}
