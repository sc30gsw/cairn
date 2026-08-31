import type { QueryCtx } from "../../_generated/server";
import { NOTIFICATION_LIST_LIMIT } from "../../lib/notifications";
import type { NotificationPageDto } from "../../lib/validators";
import { toNotificationDto } from "./toNotificationDto";

export async function list(ctx: QueryCtx, ownerId: string): Promise<NotificationPageDto> {
  const all = await ctx.db
    .query("notifications")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .order("desc")
    .collect();
  return {
    items: all.slice(0, NOTIFICATION_LIST_LIMIT).map(toNotificationDto),
    unreadCount: all.filter((doc) => doc.readAt === undefined).length,
  };
}
