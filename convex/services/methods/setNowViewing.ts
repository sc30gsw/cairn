import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedMethod } from "./helpers";

//* いま見るはカタログの正面に置く1件の印。所有者ごとに高々1件を、同一トランザクション内で
//* 他の方法の印を消してから立てることで守る(CVX-15)。今日のボードには何も起こさない(参照専用)。
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

  //? 所有者の方法は数十件想定。index で絞った collect(CVX-11)。
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
