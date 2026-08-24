import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { deliverSlackRef } from "../../lib/notificationRefs";
import { hourJst, isQuietHourJst, notificationDedupeKey } from "../../lib/notifications";
import type { NotificationPayload } from "../../lib/validators";

//* 通知の生成点。べき等性はこの1箇所に閉じている — dedupeKey が既にあれば何もしない。
//? 静穏時間は押し出しだけを止める。通知欄の行は静穏中でも作り、落とした押し出しは持ち越さない。
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
  const quiet = isQuietHourJst(hourJst(now), setting.quietFromHourJst, setting.quietToHourJst);
  if (setting.slackEnabled && setting.slackWebhookUrl !== undefined && !quiet) {
    //? scheduler 経由(CVX-05/06)。Slack が落ちていても記録のトランザクションは巻き戻らない。
    await ctx.scheduler.runAfter(0, deliverSlackRef, { notificationId });
  }
  return null;
}
