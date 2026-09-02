import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import {
  EVENING_HOUR_MESSAGE,
  EVENING_HOUR_RANGE,
  QUIET_HOUR_MESSAGE,
  QUIET_HOUR_RANGE,
} from "../../lib/notifications";
import { throwDomain } from "../../lib/ownerFunctions";
import type { NotificationSettingsDto } from "../../lib/validators";
import { getOwnerSettings } from "./getOwnerSettings";

type SaveNotificationSettingsArgs = NotificationSettingsDto;

function requireHour(hour: number, range: { max: number; min: number }, message: string): void {
  if (!Number.isInteger(hour) || hour < range.min || hour > range.max) {
    throwDomain(new ValidationFailedError({ message }));
  }
}

export async function saveSettings(
  ctx: MutationCtx,
  ownerId: string,
  args: SaveNotificationSettingsArgs,
): Promise<Id<"notificationSettings">> {
  requireHour(args.eveningHourJst, EVENING_HOUR_RANGE, EVENING_HOUR_MESSAGE);
  requireHour(args.quietFromHourJst, QUIET_HOUR_RANGE, QUIET_HOUR_MESSAGE);
  requireHour(args.quietToHourJst, QUIET_HOUR_RANGE, QUIET_HOUR_MESSAGE);
  const fields = {
    enabled: args.enabled,
    eveningHourJst: args.eveningHourJst,
    quietFromHourJst: args.quietFromHourJst,
    quietToHourJst: args.quietToHourJst,
    triggers: args.triggers,
  };
  const existing = await getOwnerSettings(ctx, ownerId);
  if (existing === null) {
    return await ctx.db.insert("notificationSettings", { ...fields, ownerId });
  }
  await ctx.db.patch("notificationSettings", existing._id, fields);
  return existing._id;
}
