import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  hourJst,
  isQuietHourJst,
  NOTIFICATION_DEFAULTS,
  notificationDedupeKey,
} from "../../lib/notifications";
import type { NotificationPayload } from "../../lib/validators";

export async function emitNotification(
  ctx: MutationCtx,
  setting: Doc<"notificationSettings">,
  payload: NotificationPayload,
  now: number,
): Promise<null> {
  const dedupeKey = notificationDedupeKey(payload);
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_owner_and_dedupeKey", (q) =>
      q.eq("ownerId", setting.ownerId).eq("dedupeKey", dedupeKey),
    )
    .take(1);
  if (existing.length > 0) {
    return null;
  }
  const notificationId = await ctx.db.insert("notifications", {
    dedupeKey,
    ownerId: setting.ownerId,
    payload,
  });
  //? 押し出しは行の insert 後に scheduler で走るアダプタに閉じる（notifications.md §2.4 / §9.1）。
  //? 静穏時間は押し出しだけを止め、翌朝に持ち越さない。端末が1つも無ければ何もしない
  const quiet = isQuietHourJst(
    hourJst(now),
    setting.quietFromHourJst ?? NOTIFICATION_DEFAULTS.quietFromHourJst,
    setting.quietToHourJst ?? NOTIFICATION_DEFAULTS.quietToHourJst,
  );
  if (quiet) {
    return null;
  }
  const subscription = await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_owner_and_endpoint", (q) => q.eq("ownerId", setting.ownerId))
    .first();
  if (subscription === null) {
    return null;
  }
  await ctx.scheduler.runAfter(0, internal.actions.notifications.deliverWebPush.deliverWebPush, {
    notificationId,
  });
  return null;
}
