import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

//* 対象項目が「実在する自分の項目」だけかを確かめる(IDOR 防止 + dangling id 防止)。
//? 件数は正規化後の数件なので Promise.all で足りる。上限件数のチェックは置かない(#53 §7.2)。
export async function assertScopeItems(
  ctx: MutationCtx,
  ownerId: string,
  scopeItemIds: readonly Id<"items">[] | undefined,
): Promise<null> {
  if (scopeItemIds === undefined) {
    return null;
  }
  const items = await Promise.all(scopeItemIds.map((itemId) => ctx.db.get("items", itemId)));
  if (items.some((item) => item === null || item.ownerId !== ownerId)) {
    throwDomain(new ValidationFailedError({ message: GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE }));
  }
  return null;
}
