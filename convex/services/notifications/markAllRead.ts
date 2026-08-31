import type { MutationCtx } from "../../_generated/server";

export async function markAllRead(
  ctx: MutationCtx,
  ownerId: string,
  args: { now?: number } = {},
): Promise<null> {
  const readAt = args.now ?? Date.now();
  const all = await ctx.db
    .query("notifications")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  await Promise.all(
    all.map(async (doc) => {
      if (doc.readAt === undefined) {
        await ctx.db.patch("notifications", doc._id, { readAt });
      }
    }),
  );
  return null;
}
