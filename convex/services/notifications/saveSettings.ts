import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import type { SaveNotificationSettingsArgs } from "../../lib/notificationRefs";
import {
  EVENING_HOUR_MESSAGE,
  EVENING_HOUR_RANGE,
  QUIET_HOUR_MESSAGE,
  QUIET_HOUR_RANGE,
  SLACK_REQUIRED_MESSAGE,
  SLACK_WEBHOOK_MESSAGE,
  SLACK_WEBHOOK_PATTERN,
} from "../../lib/notifications";
import { throwDomain } from "../../lib/ownerFunctions";
import { getOwnerSettings } from "./getOwnerSettings";

function requireHour(hour: number, range: { max: number; min: number }, message: string): void {
  if (!Number.isInteger(hour) || hour < range.min || hour > range.max) {
    throwDomain(new ValidationFailedError({ message }));
  }
}

//* 1所有者1行の upsert。行の作成 = オプトインなので、この mutation が通知の入口も兼ねる。
//? 保存そのものは通知を発火させない(次の該当時刻から出る)。
export async function saveSettings(
  ctx: MutationCtx,
  ownerId: string,
  args: SaveNotificationSettingsArgs,
): Promise<Id<"notificationSettings">> {
  requireHour(args.eveningHourJst, EVENING_HOUR_RANGE, EVENING_HOUR_MESSAGE);
  requireHour(args.quietFromHourJst, QUIET_HOUR_RANGE, QUIET_HOUR_MESSAGE);
  requireHour(args.quietToHourJst, QUIET_HOUR_RANGE, QUIET_HOUR_MESSAGE);
  const webhookUrl = args.slackWebhookUrl;
  //? 任意のホストへ POST させない(SSRF 防止)。同じ正規表現を Valibot 側でも使う。
  if (webhookUrl !== undefined && !SLACK_WEBHOOK_PATTERN.test(webhookUrl)) {
    throwDomain(new ValidationFailedError({ message: SLACK_WEBHOOK_MESSAGE }));
  }
  const existing = await getOwnerSettings(ctx, ownerId);
  const configured = webhookUrl !== undefined || existing?.slackWebhookUrl !== undefined;
  //? 境界は二重に守る。フォームでも送信不可にするが、サーバ側でも拒否する。
  if (args.slackEnabled && !configured) {
    throwDomain(new ValidationFailedError({ message: SLACK_REQUIRED_MESSAGE }));
  }
  //? 新しい URL に古い失敗回数を引き継がない。
  const slackFailureStreak = webhookUrl === undefined ? (existing?.slackFailureStreak ?? 0) : 0;
  const fields = {
    enabled: args.enabled,
    eveningHourJst: args.eveningHourJst,
    quietFromHourJst: args.quietFromHourJst,
    quietToHourJst: args.quietToHourJst,
    slackEnabled: args.slackEnabled,
    slackFailureStreak,
    triggers: args.triggers,
  };
  //? patch に slackWebhookUrl: undefined を渡すとフィールドが消える。未指定は「保つ」なので入れない。
  const withWebhook =
    webhookUrl === undefined ? fields : { ...fields, slackWebhookUrl: webhookUrl };
  if (existing === null) {
    return await ctx.db.insert("notificationSettings", { ...withWebhook, ownerId });
  }
  await ctx.db.patch("notificationSettings", existing._id, withWebhook);
  return existing._id;
}
