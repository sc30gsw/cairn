import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { itemIdIsInUse } from "../../lib/preset";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { itemId: Id<"items"> },
): Promise<null> {
  const item = await ctx.db.get("items", args.itemId);
  if (item === null || item.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
  }
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
  await ctx.db.delete("items", args.itemId);
  return null;
}
