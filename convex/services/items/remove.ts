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
