import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { addDaysJst, calendarDatesInMonth, mondayOfWeek } from "./lib/jst";
import { sevenDayMovingAverage } from "./lib/movingAverage";
import { confirmedVolumeMinutes } from "./lib/volume";
import { ownerQuery } from "./ownerFunctions";

export const month = ownerQuery({
  args: { todayJst: v.string(), yearMonth: v.string() },
  handler: async (ctx, args) => {
    const dates = calendarDatesInMonth(args.yearMonth);
    const start = dates[0];
    const end = dates[dates.length - 1];
    if (start === undefined || end === undefined) {
      return { days: [] };
    }
    const lookbackStart = addDaysJst(start, -6);
    const [rows, days] = await Promise.all([
      ctx.db
        .query("rows")
        .withIndex("by_owner_and_date", (q) =>
          q.eq("ownerId", ctx.ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
        )
        .collect(),
      ctx.db
        .query("days")
        .withIndex("by_owner_and_date", (q) =>
          q.eq("ownerId", ctx.ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
        )
        .collect(),
    ]);
    const liveDayDates = new Set(
      days.filter((day) => day.deletedAt === undefined).map((day) => day.dateJst),
    );
    const minutesByDate = new Map<string, number>();
    const liveRows = rows.filter(
      (row) => row.deletedAt === undefined && liveDayDates.has(row.dateJst),
    );
    const grouped = new Map<string, typeof liveRows>();
    for (const row of liveRows) {
      const bucket = grouped.get(row.dateJst) ?? [];
      bucket.push(row);
      grouped.set(row.dateJst, bucket);
    }
    for (const [dateJst, dateRows] of grouped) {
      minutesByDate.set(dateJst, confirmedVolumeMinutes(dateRows));
    }
    return {
      days: dates.map((dateJst) => ({
        dateJst,
        isRest: !liveDayDates.has(dateJst),
        minutes: minutesByDate.get(dateJst) ?? 0,
        movingAverage: sevenDayMovingAverage(minutesByDate, dateJst),
      })),
    };
  },
  returns: v.object({
    days: v.array(
      v.object({
        dateJst: v.string(),
        isRest: v.boolean(),
        minutes: v.number(),
        movingAverage: v.number(),
      }),
    ),
  }),
});

export const week = ownerQuery({
  args: { dateJst: v.string() },
  handler: async (ctx, args) => {
    const weekStart = mondayOfWeek(args.dateJst);
    const weekEnd = addDaysJst(weekStart, 6);
    const [rows, days, items, weeklyGoal] = await Promise.all([
      ctx.db
        .query("rows")
        .withIndex("by_owner_and_date", (q) =>
          q.eq("ownerId", ctx.ownerId).gte("dateJst", weekStart).lte("dateJst", weekEnd),
        )
        .collect(),
      ctx.db
        .query("days")
        .withIndex("by_owner_and_date", (q) =>
          q.eq("ownerId", ctx.ownerId).gte("dateJst", weekStart).lte("dateJst", weekEnd),
        )
        .collect(),
      ctx.db
        .query("items")
        .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
        .collect(),
      ctx.db
        .query("weeklyGoals")
        .withIndex("by_owner_and_week", (q) =>
          q.eq("ownerId", ctx.ownerId).eq("weekStartJst", weekStart),
        )
        .unique(),
    ]);
    const liveDayDates = new Set(
      days.filter((day) => day.deletedAt === undefined).map((day) => day.dateJst),
    );
    const itemById = new Map(items.map((item) => [item._id, item]));
    const liveRows: Doc<"rows">[] = [];
    const events: {
      dateJst: string;
      minutes: number;
      rowId: Doc<"rows">["_id"];
      status: Doc<"rows">["status"];
      title: string;
    }[] = [];
    for (const row of rows) {
      if (row.deletedAt !== undefined || !liveDayDates.has(row.dateJst)) {
        continue;
      }
      liveRows.push(row);
      events.push({
        dateJst: row.dateJst,
        minutes: row.minutes,
        rowId: row._id,
        status: row.status,
        title: itemById.get(row.itemId)?.name ?? "不明",
      });
    }
    const volumeMinutes = confirmedVolumeMinutes(liveRows);
    return {
      events,
      volumeMinutes,
      weekEnd,
      weekStart,
      weeklyGoalMinutes: weeklyGoal?.minutes ?? null,
    };
  },
  returns: v.object({
    events: v.array(
      v.object({
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
