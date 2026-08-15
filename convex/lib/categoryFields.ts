import type { Doc, Id } from "../_generated/dataModel";
import { SEED_CATEGORIES } from "./categories";

export function categoryFields(
  item: Doc<"items"> | undefined,
  byId: Map<Id<"categories">, Doc<"categories">>,
): { category: string; categorySortOrder: number } {
  if (item?.categoryId !== undefined) {
    const found = byId.get(item.categoryId);
    if (found !== undefined) {
      return { category: found.name, categorySortOrder: found.sortOrder };
    }
  }
  if (item?.category !== undefined) {
    const seed = SEED_CATEGORIES.find((entry) => entry.name === item.category);
    return {
      category: item.category,
      categorySortOrder: seed?.sortOrder ?? Number.MAX_SAFE_INTEGER,
    };
  }
  return { category: "不明", categorySortOrder: Number.MAX_SAFE_INTEGER };
}
