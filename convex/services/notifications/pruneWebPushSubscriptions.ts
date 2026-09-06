import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

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
