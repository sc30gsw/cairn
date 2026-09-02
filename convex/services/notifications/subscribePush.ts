import type { MutationCtx } from "../../_generated/server";
import type { PushSubscriptionInput } from "../../lib/validators";

//? endpoint ごとに upsert。同じ端末が再登録しても行は増えない
export async function subscribePush(
  ctx: MutationCtx,
  ownerId: string,
  args: PushSubscriptionInput,
): Promise<null> {
  const existing = await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_owner_and_endpoint", (q) =>
      q.eq("ownerId", ownerId).eq("endpoint", args.endpoint),
    )
    .unique();
  const fields = {
    endpoint: args.endpoint,
    expirationTime: args.expirationTime,
    keys: args.keys,
  };
  if (existing === null) {
    await ctx.db.insert("pushSubscriptions", { ...fields, ownerId });
    return null;
  }
  await ctx.db.patch("pushSubscriptions", existing._id, fields);
  return null;
}
