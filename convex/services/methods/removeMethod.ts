import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedMethod } from "./helpers";

//* 方法の削除は即時(項目・プリセット・障害プランと同じ扱い。ゴミ箱には入れない)。
export async function removeMethod(
  ctx: MutationCtx,
  ownerId: string,
  args: { methodId: Id<"methods"> },
): Promise<null> {
  await requireOwnedMethod(ctx, ownerId, args.methodId);
  await ctx.db.delete("methods", args.methodId);
  return null;
}
