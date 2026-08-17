import { groupBy, prop, sumBy } from "remeda";

import type { Doc, Id } from "../_generated/dataModel";
import { categoryFields } from "./categoryFields";
import type {
  BreakdownRow,
  CategoryBreakdown,
  DayBreakdown,
  WeekBreakdown,
  WeeklyGoal,
} from "./validators";
import { confirmedVolumeMinutes, type VolumeRow } from "./volume";

export type { BreakdownRow, CategoryBreakdown, DayBreakdown, WeekBreakdown } from "./validators";

function skippedVolumeMinutes(rows: readonly VolumeRow[]): number {
  return sumBy(rows, (row) => (row.status === "スキップ" ? row.minutes : 0));
}

function distinctConfirmedBreakdownRows(
  rows: readonly Doc<"rows">[],
  itemById: Map<Id<"items">, Doc<"items">>,
  categoryById: Map<Id<"categories">, Doc<"categories">>,
): BreakdownRow[] {
  const confirmed = rows.filter((row) => row.status === "確定");
  const grouped = groupBy(confirmed, prop("itemId"));

  return Object.values(grouped)
    .map((itemRows) => {
      const first = itemRows[0]!;
      const item = itemById.get(first.itemId);
      const { category, categorySortOrder } = categoryFields(item, categoryById);
      return {
        category,
        categorySortOrder,
        itemName: item?.name ?? "不明",
        minutes: sumBy(itemRows, prop("minutes")),
        status: "確定" as const,
      };
    })
    .toSorted(
      (left, right) =>
        left.categorySortOrder - right.categorySortOrder ||
        left.itemName.localeCompare(right.itemName, "ja"),
    )
    .map(({ category, itemName, minutes, status }) => ({
      category,
      itemName,
      minutes,
      status,
    }));
}

function aggregateByCategory(
  rows: readonly Doc<"rows">[],
  itemById: Map<Id<"items">, Doc<"items">>,
  categoryById: Map<Id<"categories">, Doc<"categories">>,
): CategoryBreakdown[] {
  const confirmed = rows.filter((row) => row.status === "確定");
  const grouped = groupBy(confirmed, (row) => {
    const item = itemById.get(row.itemId);
    return categoryFields(item, categoryById).category;
  });

  return Object.entries(grouped)
    .map(([category, categoryRows]) => {
      const item = itemById.get(categoryRows[0]!.itemId);
      const { categorySortOrder } = categoryFields(item, categoryById);
      return {
        category,
        categorySortOrder,
        minutes: sumBy(categoryRows, prop("minutes")),
      };
    })
    .toSorted(
      (left, right) =>
        left.categorySortOrder - right.categorySortOrder ||
        left.category.localeCompare(right.category, "ja"),
    );
}

export function aggregateBreakdownRows(
  rows: readonly Doc<"rows">[],
  itemById: Map<Id<"items">, Doc<"items">>,
  categoryById: Map<Id<"categories">, Doc<"categories">>,
): {
  byCategory: CategoryBreakdown[];
  confirmedMinutes: number;
  rows: BreakdownRow[];
  skippedMinutes: number;
} {
  return {
    byCategory: aggregateByCategory(rows, itemById, categoryById),
    confirmedMinutes: confirmedVolumeMinutes(rows),
    rows: distinctConfirmedBreakdownRows(rows, itemById, categoryById),
    skippedMinutes: skippedVolumeMinutes(rows),
  };
}

export function buildDayBreakdown(
  dateJst: string,
  rows: readonly Doc<"rows">[],
  liveDayDates: ReadonlySet<string>,
  itemById: Map<Id<"items">, Doc<"items">>,
  categoryById: Map<Id<"categories">, Doc<"categories">>,
): DayBreakdown {
  const isRest = !liveDayDates.has(dateJst);
  const aggregated = aggregateBreakdownRows(rows, itemById, categoryById);
  return { dateJst, isRest, ...aggregated };
}

export function buildWeekBreakdown(
  weekStart: string,
  weekEnd: string,
  weekDates: readonly string[],
  rows: readonly Doc<"rows">[],
  liveDayDates: ReadonlySet<string>,
  itemById: Map<Id<"items">, Doc<"items">>,
  categoryById: Map<Id<"categories">, Doc<"categories">>,
  weeklyGoal: WeeklyGoal,
): WeekBreakdown {
  const aggregated = aggregateBreakdownRows(rows, itemById, categoryById);
  const rowsByDate = groupBy(rows, prop("dateJst"));

  const byDay = weekDates.map((dateJst) => {
    const dayRows = rowsByDate[dateJst] ?? [];
    return {
      confirmedMinutes: confirmedVolumeMinutes(dayRows),
      dateJst,
      isRest: !liveDayDates.has(dateJst),
      skippedMinutes: skippedVolumeMinutes(dayRows),
    };
  });

  return {
    byCategory: aggregated.byCategory,
    byDay,
    confirmedMinutes: aggregated.confirmedMinutes,
    rows: aggregated.rows,
    skippedMinutes: aggregated.skippedMinutes,
    volumeMinutes: aggregated.confirmedMinutes,
    weekEnd,
    weekStart,
    weeklyGoal,
  };
}
