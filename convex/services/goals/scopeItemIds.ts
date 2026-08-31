import type { Id } from "../../_generated/dataModel";

export function normalizeScopeItemIds(
  scopeItemIds: readonly Id<"items">[] | undefined,
): Id<"items">[] | undefined {
  if (scopeItemIds === undefined) {
    return undefined;
  }
  const unique = [...new Set(scopeItemIds)];
  return unique.length === 0 ? undefined : unique;
}

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
