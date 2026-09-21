import type { MutationCtx } from "../../_generated/server";
import { nowJst } from "../../lib/notifications";
import { emitNotification } from "./emitNotification";
import { evaluateMissingTomorrowPlan } from "./evaluateMissingTomorrowPlan";

export async function notifyMissingTomorrowPlan(
  ctx: MutationCtx,
  args: { now?: number } = {},
): Promise<null> {
  const now = args.now ?? Date.now();
  const { dateJst } = nowJst(now);
  const settings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_enabled_and_eveningHourJst", (q) => q.eq("enabled", true))
    .collect();
  await Promise.all(
    settings.map(async (setting) => {
      const payload = await evaluateMissingTomorrowPlan(ctx, setting.ownerId, dateJst);
      if (payload !== null) {
        await emitNotification(ctx, setting, payload, now);
      }
    }),
  );
  return null;
}
