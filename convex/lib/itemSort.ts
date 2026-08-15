export function effectiveItemSortOrder(sortOrder: number | undefined): number {
  return sortOrder ?? Number.MAX_SAFE_INTEGER;
}

export function compareItemsBySortOrder(
  left: { name: string; sortOrder?: number },
  right: { name: string; sortOrder?: number },
): number {
  const orderDiff = effectiveItemSortOrder(left.sortOrder) - effectiveItemSortOrder(right.sortOrder);
  if (orderDiff !== 0) {
    return orderDiff;
  }
  return left.name.localeCompare(right.name, "ja");
}
