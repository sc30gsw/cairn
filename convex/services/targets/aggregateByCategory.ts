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
