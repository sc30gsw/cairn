import type { Doc, Id } from "../../_generated/dataModel";
import type { TargetProgressDto } from "../../lib/validators";
import { aggregateByCategory, currentForMetric, type TargetRow } from "./aggregateByCategory";

//* 読み終えた週の行をターゲットに突き合わせる(ctx 非依存の純関数)。
//? listWithProgress と週次レビューの2箇所から使う。突き合わせが2実装に割れないための1箇所。
export function buildTargetProgress(args: {
  categoryById: ReadonlyMap<Id<"categories">, Doc<"categories">>;
  itemById: ReadonlyMap<Id<"items">, Doc<"items">>;
  rows: readonly TargetRow[];
  targets: readonly Doc<"targets">[];
}): TargetProgressDto[] {
  //? categoryId はバックフィル済みが前提。移行前の古い項目だけが undefined で、実績に加算されず0扱いになる。
  const categoryIdByItemId = new Map<Id<"items">, Id<"categories">>(
    [...args.itemById.values()].flatMap((item) =>
      item.categoryId === undefined ? [] : [[item._id, item.categoryId] as const],
    ),
  );
  const aggregates = aggregateByCategory(args.rows, categoryIdByItemId);
  const sortOrderOf = (categoryId: Id<"categories">) =>
    args.categoryById.get(categoryId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
  //? 表示順はカテゴリの並び順に合わせる。元配列は触らない。
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
