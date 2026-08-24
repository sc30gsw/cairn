import type { ComboboxData, ComboboxItem } from "@mantine/core";

import type { CategoryDto } from "~/types/category";
import type { ItemDto, ItemId } from "~/types/item";

export const ALL_RECORDS_LABEL = "すべての記録";
export const ALL_RECORDS_SHORT = "すべて";

//? 項目が一覧から引けないとき(別デバイスの操作・楽観キャッシュのズレ)の安全網。件数だけを出す
function unresolvedLabel(count: number): string {
  return `不明な項目${String(count)}件`;
}

export type GoalScopeLabel = { full: string; itemCount: number; short: string };

//* 対象項目のラベル。full は全項目名、short は行に収まる短縮形(CVX-09 相当: 純関数)。
//? items は sortOrder 昇順で渡ってくる(items.list の並び)。表示順はその順に従う。
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
    //? 行に収まるのは先頭1件 + 残り件数まで。全項目名は親カードと編集フォームで読める
    short:
      first === undefined || labels.length === 1 ? full : `${first} +${String(labels.length - 1)}`,
  };
}

//* カテゴリ見出し付きの MultiSelect データ。空グループは含めない(純関数)。
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

//* MultiSelect が返すのはただの文字列。一覧から引き当てて Id のブランドを取り戻す(as は書かない)。
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
