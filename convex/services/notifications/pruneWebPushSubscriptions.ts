import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

//? 404 / 410 が返った購読をまとめて消す（action からの書きは1回・CVX-07）
export async function pruneWebPushSubscriptions(
  ctx: MutationCtx,
  args: Record<"subscriptionIds", Id<"pushSubscriptions">[]>,
): Promise<null> {
  await Promise.all(
    args.subscriptionIds.map(async (subscriptionId) => {
      const row = await ctx.db.get("pushSubscriptions", subscriptionId);
      if (row !== null) {
        await ctx.db.delete("pushSubscriptions", subscriptionId);
      }
    }),
  );
  return null;
}
