import { v } from "convex/values";
import { groupBy, mapValues, prop } from "remeda";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { loadCatalog } from "./lib/catalogLoader";
import { categoryFields } from "./lib/categoryFields";
import {
  aggregateBreakdownRows,
  buildDayBreakdown,
  buildWeekBreakdown,
} from "./lib/historyBreakdown";
import { addDaysJst, calendarDatesInMonth, mondayOfWeek } from "./lib/jst";
import { sevenDayMovingAverage } from "./lib/movingAverage";
import {
  dayBreakdownValidator,
  historyMonthValidator,
  historyWeekValidator,
  monthBreakdownValidator,
  weekBreakdownValidator,
  yearHeatmapValidator,
} from "./lib/validators";
import { confirmedVolumeMinutes } from "./lib/volume";
import { ownerQuery } from "./ownerFunctions";

const YEAR_HEATMAP_DAYS = 365;

function liveDayDatesFrom(days: Doc<"days">[]): Set<string> {
  return new Set(days.filter((day) => day.deletedAt === undefined).map((day) => day.dateJst));
}

function liveRows(rows: Doc<"rows">[], liveDayDates: ReadonlySet<string>): Doc<"rows">[] {
  return rows.filter((row) => row.deletedAt === undefined && liveDayDates.has(row.dateJst));
}

function calendarDatesFromTo(startDateJst: string, endDateJst: string): string[] {
  const dates: string[] = [];
  let dateJst = startDateJst;
  while (dateJst <= endDateJst) {
    dates.push(dateJst);
    dateJst = addDaysJst(dateJst, 1);
  }
  return dates;
}

function buildMinutesByDate(
  rows: Doc<"rows">[],
  liveDayDates: ReadonlySet<string>,
): Record<string, number> {
  return mapValues(groupBy(liveRows(rows, liveDayDates), prop("dateJst")), confirmedVolumeMinutes);
}

function buildHeatmapDays(
  dates: readonly string[],
  liveDayDates: ReadonlySet<string>,
  minutesByDate: Readonly<Record<string, number>>,
) {
  return dates.map((dateJst) => ({
    dateJst,
    isRest: !liveDayDates.has(dateJst),
    minutes: minutesByDate[dateJst] ?? 0,
    movingAverage: sevenDayMovingAverage(minutesByDate, dateJst),
  }));
}

async function computeYearHeatmap(ctx: QueryCtx, ownerId: string, todayJst: string) {
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
  return {
    days: buildHeatmapDays(calendarDatesFromTo(start, end), liveDayDates, minutesByDate),
    endDate: end,
    startDate: start,
  };
}

async function computeMonthBreakdown(ctx: QueryCtx, ownerId: string, yearMonth: string) {
  const dates = calendarDatesInMonth(yearMonth);
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (start === undefined || end === undefined) {
    return {
      byCategory: [],
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
  return {
    byCategory: aggregated.byCategory,
    confirmedMinutes: aggregated.confirmedMinutes,
    days: buildHeatmapDays(dates, liveDayDates, minutesByDate),
    events,
    rows: aggregated.rows,
    skippedMinutes: aggregated.skippedMinutes,
  };
}

async function computeWeekPage(ctx: QueryCtx, ownerId: string, dateJst: string) {
  const weekStart = mondayOfWeek(dateJst);
  const weekEnd = addDaysJst(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, offset) => addDaysJst(weekStart, offset));
  const [rows, days, catalog, weeklyGoal] = await Promise.all([
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
    ctx.db
      .query("weeklyGoals")
      .withIndex("by_owner_and_week", (q) => q.eq("ownerId", ownerId).eq("weekStartJst", weekStart))
      .unique(),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const liveWeekRows = liveRows(rows, liveDayDates);
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
  return {
    events,
    volumeMinutes: confirmedVolumeMinutes(liveWeekRows),
    weekBreakdown: buildWeekBreakdown(
      weekStart,
      weekEnd,
      weekDates,
      liveWeekRows,
      liveDayDates,
      catalog.itemById,
      catalog.categoryById,
      weeklyGoal?.minutes ?? null,
    ),
    weekEnd,
    weekStart,
    weeklyGoalMinutes: weeklyGoal?.minutes ?? null,
  };
}

export const month = ownerQuery({
  args: { todayJst: v.string(), yearMonth: v.string() },
  handler: async (ctx, args) => {
    const breakdown = await computeMonthBreakdown(ctx, ctx.ownerId, args.yearMonth);
    return { days: breakdown.days };
  },
  returns: historyMonthValidator,
});

export const monthBreakdown = ownerQuery({
  args: { todayJst: v.string(), yearMonth: v.string() },
  handler: async (ctx, args) => computeMonthBreakdown(ctx, ctx.ownerId, args.yearMonth),
  returns: monthBreakdownValidator,
});

export const yearHeatmap = ownerQuery({
  args: { todayJst: v.string() },
  handler: async (ctx, args) => computeYearHeatmap(ctx, ctx.ownerId, args.todayJst),
  returns: yearHeatmapValidator,
});

export const week = ownerQuery({
  args: { dateJst: v.string() },
  handler: async (ctx, args) => {
    const page = await computeWeekPage(ctx, ctx.ownerId, args.dateJst);
    return {
      events: page.events,
      volumeMinutes: page.volumeMinutes,
      weekEnd: page.weekEnd,
      weekStart: page.weekStart,
      weeklyGoalMinutes: page.weeklyGoalMinutes,
    };
  },
  returns: historyWeekValidator,
});

export const dayBreakdown = ownerQuery({
  args: { dateJst: v.string() },
  handler: async (ctx, args) => {
    const [rows, days, catalog] = await Promise.all([
      ctx.db
        .query("rows")
        .withIndex("by_owner_and_date", (q) =>
          q.eq("ownerId", ctx.ownerId).eq("dateJst", args.dateJst),
        )
        .collect(),
      ctx.db
        .query("days")
        .withIndex("by_owner_and_date", (q) =>
          q.eq("ownerId", ctx.ownerId).eq("dateJst", args.dateJst),
        )
        .collect(),
      loadCatalog(ctx, ctx.ownerId),
    ]);
    const liveDayDates = liveDayDatesFrom(days);
    return buildDayBreakdown(
      args.dateJst,
      liveRows(rows, liveDayDates),
      liveDayDates,
      catalog.itemById,
      catalog.categoryById,
    );
  },
  returns: dayBreakdownValidator,
});

export const weekBreakdown = ownerQuery({
  args: { dateJst: v.string() },
  handler: async (ctx, args) => {
    const page = await computeWeekPage(ctx, ctx.ownerId, args.dateJst);
    return page.weekBreakdown;
  },
  returns: weekBreakdownValidator,
});
