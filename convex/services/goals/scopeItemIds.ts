import type { Id } from "../../_generated/dataModel";

//* 対象項目の正規化。重複を落とし、空は undefined に畳む(CVX-09: 純関数)。
//? 保存形の一意性はここが担う。空配列を残すと「すべての記録」が2つの形を持つことになる(#53 §4.1)。
export function normalizeScopeItemIds(
  scopeItemIds: readonly Id<"items">[] | undefined,
): Id<"items">[] | undefined {
  if (scopeItemIds === undefined) {
    return undefined;
  }
  const unique = [...new Set(scopeItemIds)];
  return unique.length === 0 ? undefined : unique;
}

//* 対象項目が同じか(順序・重複を無視した集合比較。CVX-09: 純関数)。
//? undefined と [] はどちらも「すべての記録」なので同一とみなす。
export function sameScopeItemIds(
  left: readonly Id<"items">[] | undefined,
  right: readonly Id<"items">[] | undefined,
): boolean {
  const leftSet = new Set(left ?? []);
  const rightSet = new Set(right ?? []);
  if (leftSet.size !== rightSet.size) {
    return false;
  }
  for (const itemId of leftSet) {
    if (!rightSet.has(itemId)) {
      return false;
    }
  }
  return true;
}
