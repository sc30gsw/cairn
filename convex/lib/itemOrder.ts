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

export type RenameItemArgs = {
  categoryId: ItemDto["categoryId"];
  itemId: ItemDto["_id"];
  name: string;
};

export function applyRenameToList(items: readonly ItemDto[], args: RenameItemArgs): ItemDto[] {
  const item = items.find((entry) => entry._id === args.itemId);
  if (item === undefined) {
    return [...items];
  }
  const movedCategory = item.categoryId !== args.categoryId;
  const targetMaxSort = items
    .filter((entry) => entry.categoryId === args.categoryId && entry._id !== args.itemId)
    .reduce((max, entry) => Math.max(max, entry.sortOrder), -1);
  const sortOrder = movedCategory ? targetMaxSort + 1 : item.sortOrder;

  return items.map((entry) =>
    entry._id === args.itemId
      ? { ...entry, categoryId: args.categoryId, name: args.name, sortOrder }
      : entry,
  );
}
