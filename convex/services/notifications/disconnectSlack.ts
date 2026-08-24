import type { MutationCtx } from "../../_generated/server";
import { getOwnerSettings } from "./getOwnerSettings";

//* Slack 連携の解除。URL を消し、押し出しを止め、失敗回数を戻す(§9.2 の「解除できる」)。
export async function disconnectSlack(ctx: MutationCtx, ownerId: string): Promise<null> {
  const existing = await getOwnerSettings(ctx, ownerId);
  if (existing === null) {
    return null;
  }
  await ctx.db.patch("notificationSettings", existing._id, {
    slackEnabled: false,
    slackFailureStreak: 0,
    //? undefined の patch はフィールドの削除。ここでは削除が意図。
    slackWebhookUrl: undefined,
  });
  return null;
}
