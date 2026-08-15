import type { Doc, Id } from "../_generated/dataModel";
import { categoryFields } from "./categoryFields";
import { confirmedVolumeMinutes, type VolumeRow } from "./volume";

export type BreakdownRow = {
  category: string;
  itemName: string;
  minutes: number;
  status: "スキップ" | "未着手" | "確定";
};

export type CategoryBreakdown = {
  category: string;
  categorySortOrder: number;
  minutes: number;
};

export type DayBreakdown = {
  byCategory: CategoryBreakdown[];
  confirmedMinutes: number;
  dateJst: string;
  isRest: boolean;
  rows: BreakdownRow[];
  skippedMinutes: number;
};

export type WeekDayBreakdown = {
  confirmedMinutes: number;
  dateJst: string;
  isRest: boolean;
  skippedMinutes: number;
};

export type WeekBreakdown = {
  byCategory: CategoryBreakdown[];
  byDay: WeekDayBreakdown[];
  confirmedMinutes: number;
  rows: BreakdownRow[];
  skippedMinutes: number;
  volumeMinutes: number;
  weekEnd: string;
  weekStart: string;
  weeklyGoalMinutes: null | number;
};

export type MonthBreakdownDay = {
  dateJst: string;
  isRest: boolean;
  minutes: number;
  movingAverage: number;
};

export type MonthBreakdown = {
  byCategory: CategoryBreakdown[];
  confirmedMinutes: number;
  days: MonthBreakdownDay[];
  rows: BreakdownRow[];
  skippedMinutes: number;
};

function skippedVolumeMinutes(rows: readonly VolumeRow[]): number {
  let total = 0;
  for (const row of rows) {
    if (row.status === "スキップ") {
      total += row.minutes;
    }
  }
  return total;
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
  const confirmedMinutes = confirmedVolumeMinutes(rows);
  const skippedMinutes = skippedVolumeMinutes(rows);
  const categoryMinutes = new Map<string, { minutes: number; sortOrder: number }>();
  const breakdownRows: BreakdownRow[] = [];

  for (const row of rows) {
    const item = itemById.get(row.itemId);
    const { category, categorySortOrder } = categoryFields(item, categoryById);
    breakdownRows.push({
      category,
      itemName: item?.name ?? "不明",
      minutes: row.minutes,
      status: row.status,
    });
    if (row.status !== "確定") {
      continue;
    }
    const existing = categoryMinutes.get(category) ?? { minutes: 0, sortOrder: categorySortOrder };
    categoryMinutes.set(category, {
      minutes: existing.minutes + row.minutes,
      sortOrder: categorySortOrder,
    });
  }

  const byCategory = [...categoryMinutes.entries()]
    .map(([category, data]) => ({
      category,
      categorySortOrder: data.sortOrder,
      minutes: data.minutes,
    }))
    .toSorted(
      (left, right) =>
        left.categorySortOrder - right.categorySortOrder ||
        left.category.localeCompare(right.category, "ja"),
    );

  return { byCategory, confirmedMinutes, rows: breakdownRows, skippedMinutes };
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
  weeklyGoalMinutes: null | number,
): WeekBreakdown {
  const aggregated = aggregateBreakdownRows(rows, itemById, categoryById);
  const rowsByDate = new Map<string, Doc<"rows">[]>();
  for (const row of rows) {
    const bucket = rowsByDate.get(row.dateJst) ?? [];
    bucket.push(row);
    rowsByDate.set(row.dateJst, bucket);
  }

  const byDay = weekDates.map((dateJst) => {
    const dayRows = rowsByDate.get(dateJst) ?? [];
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
    weeklyGoalMinutes,
  };
}
