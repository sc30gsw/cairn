import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { categoryFields } from "./lib/categoryFields";
import {
  aggregateBreakdownRows,
  buildDayBreakdown,
  buildWeekBreakdown,
} from "./lib/historyBreakdown";
import { addDaysJst, calendarDatesInMonth, mondayOfWeek } from "./lib/jst";
import { sevenDayMovingAverage } from "./lib/movingAverage";
import { confirmedVolumeMinutes } from "./lib/volume";
import { ownerQuery } from "./ownerFunctions";

const categoryBreakdownValidator = v.object({
  category: v.string(),
  categorySortOrder: v.number(),
  minutes: v.number(),
});

const breakdownRowValidator = v.object({
  category: v.string(),
  itemName: v.string(),
  minutes: v.number(),
  status: v.union(v.literal("確定"), v.literal("未着手"), v.literal("スキップ")),
});

const monthDayValidator = v.object({
  dateJst: v.string(),
  isRest: v.boolean(),
  minutes: v.number(),
  movingAverage: v.number(),
});

const monthEventValidator = v.object({
  category: v.string(),
  dateJst: v.string(),
  minutes: v.number(),
  rowId: v.id("rows"),
  status: v.union(v.literal("確定"), v.literal("未着手"), v.literal("スキップ")),
  title: v.string(),
});

async function loadCatalog(ctx: QueryCtx, ownerId: string) {
  const [items, categories] = await Promise.all([
    ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("categories")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);
  return {
    categoryById: new Map(categories.map((category) => [category._id, category])),
    itemById: new Map(items.map((item) => [item._id, item])),
  };
}

function liveDayDatesFrom(days: Doc<"days">[]): Set<string> {
  return new Set(days.filter((day) => day.deletedAt === undefined).map((day) => day.dateJst));
}

function liveRows(rows: Doc<"rows">[], liveDayDates: ReadonlySet<string>): Doc<"rows">[] {
  return rows.filter((row) => row.deletedAt === undefined && liveDayDates.has(row.dateJst));
}

async function computeMonthBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  yearMonth: string,
) {
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
  const minutesByDate = new Map<string, number>();
  const grouped = new Map<string, Doc<"rows">[]>();
  for (const row of liveRows(rows, liveDayDates)) {
    const bucket = grouped.get(row.dateJst) ?? [];
    bucket.push(row);
    grouped.set(row.dateJst, bucket);
  }
  for (const [dateJst, dateRows] of grouped) {
    minutesByDate.set(dateJst, confirmedVolumeMinutes(dateRows));
  }
  return {
    byCategory: aggregated.byCategory,
    confirmedMinutes: aggregated.confirmedMinutes,
    days: dates.map((dateJst) => ({
      dateJst,
      isRest: !liveDayDates.has(dateJst),
      minutes: minutesByDate.get(dateJst) ?? 0,
      movingAverage: sevenDayMovingAverage(minutesByDate, dateJst),
    })),
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
      .withIndex("by_owner_and_week", (q) =>
        q.eq("ownerId", ownerId).eq("weekStartJst", weekStart),
      )
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
  returns: v.object({
    days: v.array(monthDayValidator),
  }),
});

export const monthBreakdown = ownerQuery({
  args: { todayJst: v.string(), yearMonth: v.string() },
  handler: async (ctx, args) => computeMonthBreakdown(ctx, ctx.ownerId, args.yearMonth),
  returns: v.object({
    byCategory: v.array(categoryBreakdownValidator),
    confirmedMinutes: v.number(),
    days: v.array(monthDayValidator),
    events: v.array(monthEventValidator),
    rows: v.array(breakdownRowValidator),
    skippedMinutes: v.number(),
  }),
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
  returns: v.object({
    events: v.array(
      v.object({
        category: v.string(),
        dateJst: v.string(),
        minutes: v.number(),
        rowId: v.id("rows"),
        status: v.union(v.literal("確定"), v.literal("未着手"), v.literal("スキップ")),
        title: v.string(),
      }),
    ),
    volumeMinutes: v.number(),
    weekEnd: v.string(),
    weekStart: v.string(),
    weeklyGoalMinutes: v.union(v.number(), v.null()),
  }),
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
  returns: v.object({
    byCategory: v.array(categoryBreakdownValidator),
    confirmedMinutes: v.number(),
    dateJst: v.string(),
    isRest: v.boolean(),
    rows: v.array(breakdownRowValidator),
    skippedMinutes: v.number(),
  }),
});

export const weekBreakdown = ownerQuery({
  args: { dateJst: v.string() },
  handler: async (ctx, args) => {
    const page = await computeWeekPage(ctx, ctx.ownerId, args.dateJst);
    return page.weekBreakdown;
  },
  returns: v.object({
    byCategory: v.array(categoryBreakdownValidator),
    byDay: v.array(
      v.object({
        confirmedMinutes: v.number(),
        dateJst: v.string(),
        isRest: v.boolean(),
        skippedMinutes: v.number(),
      }),
    ),
    confirmedMinutes: v.number(),
    rows: v.array(breakdownRowValidator),
    skippedMinutes: v.number(),
    volumeMinutes: v.number(),
    weekEnd: v.string(),
    weekStart: v.string(),
    weeklyGoalMinutes: v.union(v.number(), v.null()),
  }),
});
