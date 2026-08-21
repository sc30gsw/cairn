import { groupBy, mapValues, prop } from "remeda";

import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { categoryFields } from "../../lib/categoryFields";
import type { Condition } from "../../lib/conditions";
import { isRestCalendarDate } from "../../lib/dayView";
import {
  aggregateBreakdownRows,
  aggregateByCondition,
  buildDayBreakdown,
  buildWeekBreakdown,
} from "../../lib/historyBreakdown";
import { addDaysJst, calendarDatesInMonth, mondayOfWeek } from "../../lib/jst";
import { sevenDayMovingAverage } from "../../lib/movingAverage";
import { confirmedVolumeMinutes } from "../../lib/volume";

export const YEAR_HEATMAP_DAYS = 365;

export function liveDayDatesFrom(days: Doc<"days">[]): Set<string> {
  return new Set(days.filter((day) => day.deletedAt === undefined).map((day) => day.dateJst));
}

export function liveRows(rows: Doc<"rows">[], liveDayDates: ReadonlySet<string>): Doc<"rows">[] {
  return rows.filter((row) => row.deletedAt === undefined && liveDayDates.has(row.dateJst));
}

export function calendarDatesFromTo(startDateJst: string, endDateJst: string): string[] {
  const dates: string[] = [];
  let dateJst = startDateJst;
  while (dateJst <= endDateJst) {
    dates.push(dateJst);
    dateJst = addDaysJst(dateJst, 1);
  }
  return dates;
}

export function buildMinutesByDate(
  rows: Doc<"rows">[],
  liveDayDates: ReadonlySet<string>,
): Record<string, number> {
  return mapValues(groupBy(liveRows(rows, liveDayDates), prop("dateJst")), confirmedVolumeMinutes);
}

export function buildConditionByDate(days: Doc<"days">[]): Record<string, Condition | null> {
  const map: Record<string, Condition | null> = {};
  for (const day of days) {
    if (day.deletedAt !== undefined) {
      continue;
    }
    map[day.dateJst] = day.condition ?? null;
  }
  return map;
}

export function buildHeatmapDays(
  dates: readonly string[],
  todayJst: string,
  liveDayDates: ReadonlySet<string>,
  minutesByDate: Readonly<Record<string, number>>,
  conditionByDate: Readonly<Record<string, Condition | null>>,
) {
  return dates.map((dateJst) => ({
    condition: conditionByDate[dateJst] ?? null,
    dateJst,
    isRest: isRestCalendarDate(dateJst, todayJst, liveDayDates.has(dateJst)),
    minutes: minutesByDate[dateJst] ?? 0,
    movingAverage: sevenDayMovingAverage(minutesByDate, dateJst),
  }));
}

export async function computeYearHeatmap(ctx: QueryCtx, ownerId: string, todayJst: string) {
  const end = todayJst;
  const start = addDaysJst(end, -(YEAR_HEATMAP_DAYS - 1));
  const lookbackStart = addDaysJst(start, -6);
  const [rows, days] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
      )
      .collect(),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const minutesByDate = buildMinutesByDate(rows, liveDayDates);
  const conditionByDate = buildConditionByDate(days);
  return {
    days: buildHeatmapDays(
      calendarDatesFromTo(start, end),
      todayJst,
      liveDayDates,
      minutesByDate,
      conditionByDate,
    ),
    endDate: end,
    startDate: start,
  };
}

export async function computeMonthBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; yearMonth: string },
) {
  const dates = calendarDatesInMonth(args.yearMonth);
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (start === undefined || end === undefined) {
    return {
      byCategory: [],
      byCondition: [],
      confirmedMinutes: 0,
      days: [],
      events: [],
      rows: [],
      skippedMinutes: 0,
    };
  }
  const lookbackStart = addDaysJst(start, -6);
  const [rows, days, catalog] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const monthLiveDayDates = new Set(
    [...liveDayDates].filter((dateJst) => dateJst >= start && dateJst <= end),
  );
  const liveRowsInMonth = liveRows(
    rows.filter((row) => row.dateJst >= start && row.dateJst <= end),
    monthLiveDayDates,
  );
  const aggregated = aggregateBreakdownRows(
    liveRowsInMonth,
    catalog.itemById,
    catalog.categoryById,
  );
  const events = liveRowsInMonth.map((row) => {
    const item = catalog.itemById.get(row.itemId);
    const { category } = categoryFields(item, catalog.categoryById);
    return {
      category,
      dateJst: row.dateJst,
      minutes: row.minutes,
      rowId: row._id,
      status: row.status,
      title: item?.name ?? "不明",
    };
  });
  const minutesByDate = buildMinutesByDate(rows, liveDayDates);
  const conditionByDate = buildConditionByDate(days);
  return {
    byCategory: aggregated.byCategory,
    byCondition: aggregateByCondition(liveRowsInMonth, conditionByDate),
    confirmedMinutes: aggregated.confirmedMinutes,
    days: buildHeatmapDays(dates, args.todayJst, liveDayDates, minutesByDate, conditionByDate),
    events,
    rows: aggregated.rows,
    skippedMinutes: aggregated.skippedMinutes,
  };
}

export async function computeWeekPage(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
) {
  const weekStart = mondayOfWeek(args.dateJst);
  const weekEnd = addDaysJst(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, offset) => addDaysJst(weekStart, offset));
  const lookbackStart = addDaysJst(weekStart, -6);
  const [rows, days, catalog] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", weekEnd),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", weekEnd),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const liveWeekRows = liveRows(
    rows.filter((row) => row.dateJst >= weekStart && row.dateJst <= weekEnd),
    liveDayDates,
  );
  const events = liveWeekRows.map((row) => {
    const item = catalog.itemById.get(row.itemId);
    const { category } = categoryFields(item, catalog.categoryById);
    return {
      category,
      dateJst: row.dateJst,
      minutes: row.minutes,
      rowId: row._id,
      status: row.status,
      title: item?.name ?? "不明",
    };
  });
  const minutesByDate = buildMinutesByDate(rows, liveDayDates);
  const conditionByDate = buildConditionByDate(days);
  return {
    days: buildHeatmapDays(weekDates, args.todayJst, liveDayDates, minutesByDate, conditionByDate),
    events,
    volumeMinutes: confirmedVolumeMinutes(liveWeekRows),
    weekBreakdown: buildWeekBreakdown(
      weekStart,
      weekEnd,
      weekDates,
      args.todayJst,
      liveWeekRows,
      liveDayDates,
      catalog.itemById,
      catalog.categoryById,
      conditionByDate,
    ),
    weekEnd,
    weekStart,
  };
}

export { buildDayBreakdown };
