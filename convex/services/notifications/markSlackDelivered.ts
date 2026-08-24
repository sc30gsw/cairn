import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { SLACK_FAILURE_STREAK_LIMIT } from "../../lib/notifications";
import { getOwnerSettings } from "./getOwnerSettings";

//* 配信結果の記録と連続失敗の自動停止。1トランザクションで通知行と設定行の両方を動かす(CVX-15)。
//? 自動停止は Webhook が失効したときに無駄な fetch を打ち続けないため。通知にはしない。
export async function markSlackDelivered(
  ctx: MutationCtx,
  args: { error?: string; notificationId: Id<"notifications">; now?: number },
): Promise<null> {
  const notification = await ctx.db.get("notifications", args.notificationId);
  if (notification === null) {
    return null;
  }
  const setting = await getOwnerSettings(ctx, notification.ownerId);
  if (args.error === undefined) {
    await ctx.db.patch("notifications", args.notificationId, {
      slackDeliveredAt: args.now ?? Date.now(),
      slackError: undefined,
    });
    if (setting !== null && setting.slackFailureStreak !== 0) {
      await ctx.db.patch("notificationSettings", setting._id, { slackFailureStreak: 0 });
    }
    return null;
  }
  await ctx.db.patch("notifications", args.notificationId, { slackError: args.error });
  if (setting !== null) {
    const slackFailureStreak = setting.slackFailureStreak + 1;
    await ctx.db.patch("notificationSettings", setting._id, {
      slackEnabled: slackFailureStreak >= SLACK_FAILURE_STREAK_LIMIT ? false : setting.slackEnabled,
      slackFailureStreak,
    });
  }
  return null;
}
