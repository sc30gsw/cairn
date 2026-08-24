import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { itemIdIsInUse } from "../../lib/preset";
import { requireOwnedItem } from "./helpers";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { itemId: Id<"items"> },
): Promise<null> {
  await requireOwnedItem(ctx, ownerId, args.itemId);
  //? 使用中かどうかだけ知りたいので、履歴 rows 全件ではなく先頭1件で判定する(CVX-11)
  const [rowUsingItem, presets] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .first(),
    ctx.db
      .query("presets")
      .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);
  const holders = [
    ...(rowUsingItem === null ? [] : [rowUsingItem]),
    ...presets.flatMap((preset) => preset.lines),
  ];
  if (itemIdIsInUse(args.itemId, holders)) {
    throwDomain(new ConflictError({ message: "使っている行または雛形がある項目は消せません" }));
  }
  //? 対象項目にしている目標があれば消せない。自動で対象から外すと、最後の1件が外れた瞬間に
  //? スコープが「すべての記録」へ静かに広がり、カウンタの意味が反転する(#53 §8)。
  //? 1所有者の習得目標は数件。type で絞ってから collect(CVX-10/11)。
  const masteryGoals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();
  if (
    masteryGoals.some(
      (goal) => goal.type === "mastery" && goal.scopeItemIds?.includes(args.itemId) === true,
    )
  ) {
    throwDomain(new ConflictError({ message: "対象項目にしている目標がある項目は消せません" }));
  }
  await ctx.db.delete("items", args.itemId);
  return null;
}
