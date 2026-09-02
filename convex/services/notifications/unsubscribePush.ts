import type { MutationCtx } from "../../_generated/server";

export async function unsubscribePush(
  ctx: MutationCtx,
  ownerId: string,
  args: Record<"endpoint", string>,
): Promise<null> {
  const existing = await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_owner_and_endpoint", (q) =>
      q.eq("ownerId", ownerId).eq("endpoint", args.endpoint),
    )
    .unique();
  if (existing !== null) {
    await ctx.db.delete("pushSubscriptions", existing._id);
  }
  return null;
}
