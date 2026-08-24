import type { QueryCtx } from "../../_generated/server";
import { NOTIFICATION_DEFAULTS } from "../../lib/notifications";
import type { NotificationSettingsDto } from "../../lib/validators";
import { getOwnerSettings } from "./getOwnerSettings";

//* 設定 DTO。行が無いときは既定値をそのまま返す(クライアントに既定値を書かない)。
//? slackWebhookUrl は返さない。設定済みかどうかだけを boolean で出す(§9.2)。
export async function settings(ctx: QueryCtx, ownerId: string): Promise<NotificationSettingsDto> {
  const row = await getOwnerSettings(ctx, ownerId);
  if (row === null) {
    return NOTIFICATION_DEFAULTS;
  }
  return {
    enabled: row.enabled,
    eveningHourJst: row.eveningHourJst,
    quietFromHourJst: row.quietFromHourJst,
    quietToHourJst: row.quietToHourJst,
    slackConfigured: row.slackWebhookUrl !== undefined,
    slackEnabled: row.slackEnabled,
    slackFailureStreak: row.slackFailureStreak,
    triggers: row.triggers,
  };
}
