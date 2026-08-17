import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedCategory } from "../items/helpers";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { categoryId: Id<"categories"> },
): Promise<null> {
  await requireOwnedCategory(ctx, ownerId, args.categoryId);
  //? 残存有無だけ知りたいので先頭1件で判定する(CVX-11)
  const itemInCategory = await ctx.db
    .query("items")
    .withIndex("by_category_and_sortOrder", (q) => q.eq("categoryId", args.categoryId))
    .first();
  if (itemInCategory !== null) {
    throwDomain(new ConflictError({ message: "項目が残っているカテゴリは消せません" }));
  }
  //? 週間ターゲットはカテゴリに紐づくので、孤児を残さず同じトランザクションで消す(CVX-15)
  const orphanedTargets = await ctx.db
    .query("targets")
    .withIndex("by_owner_and_category", (q) =>
      q.eq("ownerId", ownerId).eq("categoryId", args.categoryId),
    )
    .collect();
  await Promise.all(orphanedTargets.map((target) => ctx.db.delete("targets", target._id)));
  await ctx.db.delete("categories", args.categoryId);
  return null;
}
