import type { ItemDto, CategoryItemOrder } from "./validators";

export type { CategoryItemOrder };

export function applyItemOrderToList(
  items: readonly ItemDto[],
  updates: readonly CategoryItemOrder[],
): ItemDto[] {
  if (updates.length === 0) {
    return [...items];
  }

  const itemById = new Map(items.map((item) => [item._id, item]));
  const nextById = new Map<ItemDto["_id"], ItemDto>();

  for (const update of updates) {
    for (const [sortOrder, itemId] of update.orderedItemIds.entries()) {
      const existing = itemById.get(itemId);
      if (existing === undefined) {
        continue;
      }
      nextById.set(itemId, {
        ...existing,
        categoryId: update.categoryId,
        sortOrder,
      });
    }
  }

  return items.map((item) => nextById.get(item._id) ?? item);
}
