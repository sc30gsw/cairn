import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireWeekStartJst } from "../../lib/dateArgs";
import { addDaysJst } from "../../lib/jst";
import type { TargetProgressDto } from "../../lib/validators";
import { liveDayDatesFrom, liveRows } from "../history/shared";
import { aggregateByCategory, currentForMetric } from "./aggregateByCategory";

//* 今週(weekStartJst 〜 +6日)のカテゴリ別実績をターゲットに突き合わせる。
//? 週は引数で受け取る(CVX-14)が、月曜への正規化はサーバが担う。今週専用の計器で、過去週には出さない。
export async function listWithProgress(
  ctx: QueryCtx,
  ownerId: string,
  args: { weekStartJst: string },
): Promise<TargetProgressDto[]> {
  const weekStart = requireWeekStartJst(args.weekStartJst);
  const weekEnd = addDaysJst(weekStart, 6);
  const [targets, rows, days, catalog] = await Promise.all([
    ctx.db
      .query("targets")
      .withIndex("by_owner_and_category", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", weekStart).lte("dateJst", weekEnd),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", weekStart).lte("dateJst", weekEnd),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);
  //? categoryId はバックフィル済みが前提。移行前の古い項目だけが undefined で、実績に加算されず0扱いになる。
  const categoryIdByItemId = new Map<Id<"items">, Id<"categories">>(
    [...catalog.itemById.values()].flatMap((item) =>
      item.categoryId === undefined ? [] : [[item._id, item.categoryId] as const],
    ),
  );
  const aggregates = aggregateByCategory(
    liveRows(rows, liveDayDatesFrom(days)),
    categoryIdByItemId,
  );
  const sortOrderOf = (categoryId: Id<"categories">) =>
    catalog.categoryById.get(categoryId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
  //? 表示順はカテゴリの並び順に合わせる。元配列は触らない。
  const ordered = targets.toSorted(
    (left, right) => sortOrderOf(left.categoryId) - sortOrderOf(right.categoryId),
  );
  return ordered.map((target) => {
    const current = currentForMetric(aggregates.get(target.categoryId), target.metric);
    return {
      _id: target._id,
      achieved: current >= target.targetValue,
      categoryId: target.categoryId,
      categoryName: catalog.categoryById.get(target.categoryId)?.name ?? "不明",
      current,
      metric: target.metric,
      targetValue: target.targetValue,
    };
  });
}
