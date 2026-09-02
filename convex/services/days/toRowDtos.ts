import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { categoryFields } from "../../lib/categoryFields";
import { loadOwnerReviewFlags } from "../reviews/loadOwnerReviewFlags";
import { reviewOfRows } from "../reviews/reviewOfRows";
import { toRowTimerDto } from "../rows/toRowTimerDto";

export async function toRowDtos(ctx: QueryCtx | MutationCtx, ownerId: string, rows: Doc<"rows">[]) {
  const [catalog, flags] = await Promise.all([
    loadCatalog(ctx, ownerId),
    loadOwnerReviewFlags(ctx, ownerId),
  ]);
  const reviewOf = reviewOfRows(flags);
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
      review: reviewOf(row._id),
      sortOrder: row.sortOrder,
      status: row.status,
      timer: toRowTimerDto(row),
    };
  });
}
