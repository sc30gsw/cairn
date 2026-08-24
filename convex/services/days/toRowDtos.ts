import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { categoryFields } from "../../lib/categoryFields";
import { toRowTimerDto } from "../rows/toRowTimerDto";

export async function toRowDtos(ctx: QueryCtx | MutationCtx, ownerId: string, rows: Doc<"rows">[]) {
  const catalog = await loadCatalog(ctx, ownerId);
  return rows.map((row) => {
    const item = catalog.itemById.get(row.itemId);
    const fields = categoryFields(item, catalog.categoryById);
    return {
      _id: row._id,
      category: fields.category,
      categorySortOrder: fields.categorySortOrder,
      content: row.content,
      itemId: row.itemId,
      itemName: item?.name ?? "不明",
      minutes: row.minutes,
      sortOrder: row.sortOrder,
      status: row.status,
      timer: toRowTimerDto(row),
    };
  });
}
