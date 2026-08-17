import type { Id } from "../../_generated/dataModel";
import type { TargetMetric } from "../../lib/domain";
import type { RowStatus } from "../../lib/validators";

export type TargetRow = {
  dateJst: string;
  itemId: Id<"items">;
  minutes: number;
  status: RowStatus;
};

export type CategoryAggregate = {
  count: number;
  days: number;
  minutes: number;
};

export const EMPTY_CATEGORY_AGGREGATE = {
  count: 0,
  days: 0,
  minutes: 0,
} as const satisfies CategoryAggregate;

//* 今週の行をカテゴリ別に集計する。rows→item→categoryId 経由で辿り、確定行だけを見る(CVX-09: 純関数)。
//? days は「そのカテゴリの確定記録が1件以上ある暦日数」。週間ゴールのフロア(分数)とは無関係。
export function aggregateByCategory(
  rows: readonly TargetRow[],
  categoryIdByItemId: ReadonlyMap<Id<"items">, Id<"categories">>,
): Map<Id<"categories">, CategoryAggregate> {
  const datesByCategory = new Map<Id<"categories">, Set<string>>();
  const totalsByCategory = new Map<Id<"categories">, Omit<CategoryAggregate, "days">>();
  for (const row of rows) {
    if (row.status !== "確定") {
      continue;
    }
    const categoryId = categoryIdByItemId.get(row.itemId);
    if (categoryId === undefined) {
      continue;
    }
    const totals = totalsByCategory.get(categoryId) ?? { count: 0, minutes: 0 };
    totalsByCategory.set(categoryId, {
      count: totals.count + 1,
      minutes: totals.minutes + row.minutes,
    });
    const dates = datesByCategory.get(categoryId) ?? new Set<string>();
    dates.add(row.dateJst);
    datesByCategory.set(categoryId, dates);
  }
  return new Map(
    [...totalsByCategory].map(([categoryId, totals]) => [
      categoryId,
      { ...totals, days: datesByCategory.get(categoryId)?.size ?? 0 },
    ]),
  );
}

//* 計器ごとに読み取る値を選ぶ。記録の無いカテゴリは 0(CVX-09: 純関数)。
export function currentForMetric(
  aggregate: CategoryAggregate | undefined,
  metric: TargetMetric,
): number {
  const totals = aggregate ?? EMPTY_CATEGORY_AGGREGATE;
  switch (metric) {
    case "minutes":
      return totals.minutes;
    case "days":
      return totals.days;
    default:
      return totals.count;
  }
}
