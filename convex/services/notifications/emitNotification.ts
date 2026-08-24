import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { notificationDedupeKey } from "../../lib/notifications";
import type { NotificationPayload } from "../../lib/validators";

//* 通知の生成点。べき等性はこの1箇所に閉じている — dedupeKey が既にあれば何もしない。
//? v1 のチャネルはアプリ内通知欄だけなので、行を作ればそれが配信そのもの。
export async function emitNotification(
  ctx: MutationCtx,
  setting: Doc<"notificationSettings">,
  payload: NotificationPayload,
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
  await ctx.db.insert("notifications", {
    dedupeKey,
    ownerId: setting.ownerId,
    payload,
  });
  return null;
}
