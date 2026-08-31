import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedMethod } from "./helpers";

export async function setNowViewing(
  ctx: MutationCtx,
  ownerId: string,
  args: { methodId: Id<"methods">; nowViewing: boolean },
): Promise<null> {
  const method = await requireOwnedMethod(ctx, ownerId, args.methodId);

  if (!args.nowViewing) {
    if (method.nowViewing) {
      await ctx.db.patch("methods", args.methodId, { nowViewing: false });
    }
    return null;
  }

  const owned = await ctx.db
    .query("methods")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const clearances: Promise<void>[] = [];
  for (const other of owned) {
    if (other.nowViewing && other._id !== args.methodId) {
      clearances.push(ctx.db.patch("methods", other._id, { nowViewing: false }));
    }
  }
  await Promise.all(clearances);
  if (!method.nowViewing) {
    await ctx.db.patch("methods", args.methodId, { nowViewing: true });
  }
  return null;
}
