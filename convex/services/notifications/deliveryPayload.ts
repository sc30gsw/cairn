import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { notificationMessage } from "../../lib/notificationCopy";
import type { SlackDelivery } from "../../lib/validators";
import { getOwnerSettings } from "./getOwnerSettings";

//* Slack へ送る本文と宛先。通知が消えた/Slack が解除されたときは null(action は静かに終わる)。
//? SITE_URL が未設定ならリンク行だけ落とす。通知が env の欠落で落ちないようにする。
export async function deliveryPayload(
  ctx: QueryCtx,
  notificationId: Id<"notifications">,
): Promise<SlackDelivery | null> {
  const notification = await ctx.db.get("notifications", notificationId);
  if (notification === null) {
    return null;
  }
  const setting = await getOwnerSettings(ctx, notification.ownerId);
  if (setting === null || !setting.slackEnabled || setting.slackWebhookUrl === undefined) {
    return null;
  }
  const { body, title } = notificationMessage(notification.payload);
  const siteUrl = process.env.SITE_URL;
  const lines = [title, body];
  if (siteUrl !== undefined && siteUrl !== "") {
    lines.push(siteUrl);
  }
  return { text: lines.join("\n"), webhookUrl: setting.slackWebhookUrl };
}
