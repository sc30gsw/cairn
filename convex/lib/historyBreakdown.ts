import { groupBy, prop, sumBy } from "remeda";

import type { Doc, Id } from "../_generated/dataModel";
import { categoryFields } from "./categoryFields";
import type { Condition } from "./conditions";
import { CONDITIONS } from "./conditions";
import { isRestCalendarDate } from "./dayView";
import type {
  BreakdownRow,
  CategoryBreakdown,
  ConditionVolume,
  ConditionVolumeKey,
  DayBreakdown,
  WeekBreakdown,
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

const CONDITION_VOLUME_ORDER = [
  ...CONDITIONS,
  "未設定",
] as const satisfies readonly ConditionVolumeKey[];

type ConditionVolumeRow = Pick<VolumeRow, "minutes" | "status"> & { dateJst: string };

export function aggregateByCondition(
  rows: readonly ConditionVolumeRow[],
  conditionByDate: Readonly<Record<string, Condition | null | undefined>>,
): ConditionVolume[] {
  const buckets: Record<ConditionVolumeKey, number> = {
    未設定: 0,
    崩れた: 0,
    普通: 0,
    好調: 0,
  };

  for (const row of rows) {
    if (row.status !== "確定") {
      continue;
    }
    const key: ConditionVolumeKey = conditionByDate[row.dateJst] ?? "未設定";
    buckets[key] += row.minutes;
  }

  return CONDITION_VOLUME_ORDER.flatMap((condition) => {
    const minutes = buckets[condition];
    return minutes > 0 ? [{ condition, minutes }] : [];
  });
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
  todayJst: string,
  rows: readonly Doc<"rows">[],
  liveDayDates: ReadonlySet<string>,
  itemById: Map<Id<"items">, Doc<"items">>,
  categoryById: Map<Id<"categories">, Doc<"categories">>,
  conditionByDate: Readonly<Record<string, Condition | null | undefined>>,
): DayBreakdown {
  const isRest = isRestCalendarDate(dateJst, todayJst, liveDayDates.has(dateJst));
  const aggregated = aggregateBreakdownRows(rows, itemById, categoryById);
  return {
    ...aggregated,
    byCondition: aggregateByCondition(rows, conditionByDate),
    dateJst,
    isRest,
  };
}

export function buildWeekBreakdown(
  weekStart: string,
  weekEnd: string,
  weekDates: readonly string[],
  todayJst: string,
  rows: readonly Doc<"rows">[],
  liveDayDates: ReadonlySet<string>,
  itemById: Map<Id<"items">, Doc<"items">>,
  categoryById: Map<Id<"categories">, Doc<"categories">>,
  conditionByDate: Readonly<Record<string, Condition | null | undefined>>,
): WeekBreakdown {
  const aggregated = aggregateBreakdownRows(rows, itemById, categoryById);
  const rowsByDate = groupBy(rows, prop("dateJst"));

  const byDay = weekDates.map((dateJst) => {
    const dayRows = rowsByDate[dateJst] ?? [];
    return {
      confirmedMinutes: confirmedVolumeMinutes(dayRows),
      dateJst,
      isRest: isRestCalendarDate(dateJst, todayJst, liveDayDates.has(dateJst)),
      skippedMinutes: skippedVolumeMinutes(dayRows),
    };
  });

  return {
    byCategory: aggregated.byCategory,
    byCondition: aggregateByCondition(rows, conditionByDate),
    byDay,
    confirmedMinutes: aggregated.confirmedMinutes,
    rows: aggregated.rows,
    skippedMinutes: aggregated.skippedMinutes,
    volumeMinutes: aggregated.confirmedMinutes,
    weekEnd,
    weekStart,
  };
}
