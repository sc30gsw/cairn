import type { Doc, Id } from "../../_generated/dataModel";
import type { TargetProgressDto } from "../../lib/validators";
import { aggregateByCategory, currentForMetric, type TargetRow } from "./aggregateByCategory";

export function buildTargetProgress(args: {
  categoryById: ReadonlyMap<Id<"categories">, Doc<"categories">>;
  itemById: ReadonlyMap<Id<"items">, Doc<"items">>;
  rows: readonly TargetRow[];
  targets: readonly Doc<"targets">[];
}): TargetProgressDto[] {
  const categoryIdByItemId = new Map<Id<"items">, Id<"categories">>(
    [...args.itemById.values()].flatMap((item) =>
      item.categoryId === undefined ? [] : [[item._id, item.categoryId] as const],
    ),
  );
  const aggregates = aggregateByCategory(args.rows, categoryIdByItemId);
  const sortOrderOf = (categoryId: Id<"categories">) =>
    args.categoryById.get(categoryId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
  return args.targets
    .toSorted((left, right) => sortOrderOf(left.categoryId) - sortOrderOf(right.categoryId))
    .map((target) => {
      const current = currentForMetric(aggregates.get(target.categoryId), target.metric);
      return {
        _id: target._id,
        achieved: current >= target.targetValue,
        categoryId: target.categoryId,
        categoryName: args.categoryById.get(target.categoryId)?.name ?? "不明",
        current,
        metric: target.metric,
        targetValue: target.targetValue,
      };
    });
}
