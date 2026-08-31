import type { ComboboxData, ComboboxItem } from "@mantine/core";

import type { CategoryDto } from "~/types/category";
import type { ItemDto, ItemId } from "~/types/item";

export const ALL_RECORDS_LABEL = "すべての記録";
export const ALL_RECORDS_SHORT = "すべて";

function unresolvedLabel(count: number): string {
  return `不明な項目${String(count)}件`;
}

export type GoalScopeLabel = { full: string; itemCount: number; short: string };

export function goalScopeLabel(
  scopeItemIds: readonly ItemId[] | undefined,
  items: readonly ItemDto[],
): GoalScopeLabel {
  const scope = new Set(scopeItemIds ?? []);
  if (scope.size === 0) {
    return { full: ALL_RECORDS_LABEL, itemCount: 0, short: ALL_RECORDS_SHORT };
  }
  const names = items.flatMap((item) => (scope.has(item._id) ? [item.name] : []));
  const unresolvedCount = scope.size - names.length;
  const labels = unresolvedCount === 0 ? names : [...names, unresolvedLabel(unresolvedCount)];
  const full = labels.join(" / ");
  const [first] = labels;

  return {
    full,
    itemCount: scope.size,
    short:
      first === undefined || labels.length === 1 ? full : `${first} +${String(labels.length - 1)}`,
  };
}

export function goalScopeOptions(
  items: readonly ItemDto[],
  categories: readonly CategoryDto[],
): ComboboxData {
  const byCategory = new Map<CategoryDto["_id"], ComboboxItem[]>();
  for (const item of items) {
    const bucket = byCategory.get(item.categoryId);
    const option = { label: item.name, value: item._id };
    if (bucket === undefined) {
      byCategory.set(item.categoryId, [option]);
      continue;
    }
    bucket.push(option);
  }

  return categories.flatMap((category) => {
    const options = byCategory.get(category._id);
    return options === undefined || options.length === 0
      ? []
      : [{ group: category.name, items: options }];
  });
}

export function resolveScopeItemIds(
  values: readonly string[],
  items: readonly ItemDto[],
): { itemIds: ItemId[]; unresolved: string[] } {
  const known = new Map(items.map((item) => [item._id as string, item._id]));
  const itemIds: ItemId[] = [];
  const unresolved: string[] = [];
  for (const value of values) {
    const itemId = known.get(value);
    if (itemId === undefined) {
      unresolved.push(value);
      continue;
    }
    itemIds.push(itemId);
  }

  return { itemIds, unresolved };
}
