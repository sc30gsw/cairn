import type { Doc, Id } from "../../_generated/dataModel";
import type { RowReviewDto } from "../../lib/validators";

export function reviewOfRows(
  flags: readonly Doc<"reviewFlags">[],
): (rowId: Id<"rows">) => RowReviewDto {
  const bySource = new Map<Id<"rows">, Doc<"reviewFlags">>();
  const byReview = new Map<Id<"rows">, Doc<"reviewFlags">>();
  for (const flag of flags) {
    bySource.set(flag.sourceRowId, flag);
    if (flag.reviewRowId !== undefined) {
      byReview.set(flag.reviewRowId, flag);
    }
  }
  return (rowId) => {
    const review = byReview.get(rowId);
    if (review !== undefined) {
      return { kind: "review", stage: review.stage };
    }
    const source = bySource.get(rowId);
    if (source !== undefined) {
      return { dueJst: source.dueJst, kind: "source", stage: source.stage };
    }
    return null;
  };
}
