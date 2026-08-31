import type { MutationCtx } from "../../_generated/server";
import { NOTIFICATION_PURGE_BATCH, NOTIFICATION_TTL_MS } from "../../lib/notifications";

export async function purgeExpired(ctx: MutationCtx, args: { now?: number } = {}): Promise<null> {
  const now = args.now ?? Date.now();
  const cutoff = now - NOTIFICATION_TTL_MS;
  const oldest = await ctx.db.query("notifications").take(NOTIFICATION_PURGE_BATCH);
  const expired = oldest.filter((doc) => doc._creationTime < cutoff);
  await Promise.all(expired.map((doc) => ctx.db.delete("notifications", doc._id)));
  return null;
}
