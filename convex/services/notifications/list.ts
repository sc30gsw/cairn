import type { QueryCtx } from "../../_generated/server";
import { NOTIFICATION_LIST_LIMIT } from "../../lib/notifications";
import type { NotificationPageDto } from "../../lib/validators";
import { toNotificationDto } from "./toNotificationDto";

//* 通知欄1枚ぶん。時計を読まない(CVX-14) — 未読は readAt の有無だけで決まる。
//? 在庫は TTL(30日) × 最大3通/日 = 理論上90件。所有者条件つきの collect で足りる(CVX-11)。
//? 読みは1回。未読数は在庫全件から数えるので、表示が50件で切れてもバッジは正しい。
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
