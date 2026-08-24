import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import type { SaveNotificationSettingsArgs } from "../../lib/notificationRefs";
import { EVENING_HOUR_MESSAGE, EVENING_HOUR_RANGE } from "../../lib/notifications";
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
  const fields = {
    enabled: args.enabled,
    eveningHourJst: args.eveningHourJst,
    triggers: args.triggers,
  };
  const existing = await getOwnerSettings(ctx, ownerId);
  if (existing === null) {
    return await ctx.db.insert("notificationSettings", { ...fields, ownerId });
  }
  await ctx.db.patch("notificationSettings", existing._id, fields);
  return existing._id;
}
