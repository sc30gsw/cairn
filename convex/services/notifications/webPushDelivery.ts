import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { WebPushDelivery } from "../../lib/validators";
import { webPushMessage } from "../../lib/webPush";

//? action が読むのはこの1回だけ（CVX-07）。通知が消えていれば null
export async function webPushDelivery(
  ctx: QueryCtx,
  args: Record<"notificationId", Id<"notifications">>,
): Promise<WebPushDelivery> {
  const notification = await ctx.db.get("notifications", args.notificationId);
  if (notification === null) {
    return null;
  }
  const subscriptions = await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_owner_and_endpoint", (q) => q.eq("ownerId", notification.ownerId))
    .collect();
  if (subscriptions.length === 0) {
    return null;
  }
  return {
    message: webPushMessage(notification),
    subscriptions: subscriptions.map((row) => ({
      _id: row._id,
      endpoint: row.endpoint,
      keys: row.keys,
    })),
  };
}
