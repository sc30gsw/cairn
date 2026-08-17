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
  //? 達成量目標の項目リンクは任意のメタデータなので、削除を止めずに同じトランザクションで外す(CVX-15)
  const volumeGoals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "volume"))
    .collect();
  await Promise.all(
    volumeGoals.flatMap((goal) =>
      goal.type === "volume" && goal.itemId === args.itemId
        ? [ctx.db.patch("goals", goal._id, { itemId: undefined })]
        : [],
    ),
  );
  await ctx.db.delete("items", args.itemId);
  return null;
}
