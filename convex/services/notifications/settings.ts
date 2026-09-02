import type { QueryCtx } from "../../_generated/server";
import { NOTIFICATION_DEFAULTS } from "../../lib/notifications";
import type { NotificationSettingsDto } from "../../lib/validators";
import { getOwnerSettings } from "./getOwnerSettings";

export async function settings(ctx: QueryCtx, ownerId: string): Promise<NotificationSettingsDto> {
  const row = await getOwnerSettings(ctx, ownerId);
  if (row === null) {
    return NOTIFICATION_DEFAULTS;
  }
  return {
    enabled: row.enabled,
    eveningHourJst: row.eveningHourJst,
    quietFromHourJst: row.quietFromHourJst ?? NOTIFICATION_DEFAULTS.quietFromHourJst,
    quietToHourJst: row.quietToHourJst ?? NOTIFICATION_DEFAULTS.quietToHourJst,
    triggers: row.triggers,
  };
}
