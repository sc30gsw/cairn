import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { getDayByDate } from "./ensureCatalog";
import { NotFoundError } from "./lib/errors";
import { deleteDayAndRows, deleteRowsByIds, isPurgeDue, TRASH_TTL_MS } from "./lib/trash";
import { statusValidator } from "./lib/validators";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

const trashedDayValidator = v.object({
  _id: v.id("days"),
  dateJst: v.string(),
  deletedAt: v.number(),
});

const trashedRowValidator = v.object({
  _id: v.id("rows"),
  content: v.string(),
  dateJst: v.string(),
  deletedAt: v.number(),
  itemName: v.string(),
  minutes: v.number(),
  status: statusValidator,
});

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => {
    const [days, rows, items] = await Promise.all([
      ctx.db
        .query("days")
        .withIndex("by_owner_and_deletedAt", (q) => q.eq("ownerId", ctx.ownerId))
        .collect(),
      ctx.db
        .query("rows")
        .withIndex("by_owner_and_deletedAt", (q) => q.eq("ownerId", ctx.ownerId))
        .collect(),
      ctx.db
        .query("items")
        .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
        .collect(),
    ]);
    const itemById = new Map(items.map((item) => [item._id, item]));
    return {
      days: days
        .filter((day) => day.deletedAt !== undefined)
        .map((day) => ({ _id: day._id, dateJst: day.dateJst, deletedAt: day.deletedAt ?? 0 })),
      rows: rows
        .filter((row) => row.deletedAt !== undefined)
        .map((row) => ({
          _id: row._id,
          content: row.content,
          dateJst: row.dateJst,
          deletedAt: row.deletedAt ?? 0,
          itemName: itemById.get(row.itemId)?.name ?? "不明",
          minutes: row.minutes,
          status: row.status,
        })),
    };
  },
  returns: v.object({
    days: v.array(trashedDayValidator),
    rows: v.array(trashedRowValidator),
  }),
});

export const removeDay = ownerMutation({
  args: { dateJst: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const day = await getDayByDate(ctx, ctx.ownerId, args.dateJst);
    if (day === null || day.deletedAt !== undefined) {
      throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
    }
    await ctx.db.patch(day._id, { deletedAt: args.now });
    return null;
  },
  returns: v.null(),
});

export const restoreDay = ownerMutation({
  args: { dayId: v.id("days") },
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.dayId);
    if (day === null || day.ownerId !== ctx.ownerId || day.deletedAt === undefined) {
      throwDomain(new NotFoundError({ message: "ゴミ箱にその日はありません", resource: "日" }));
    }
    await ctx.db.patch(args.dayId, { deletedAt: undefined });
    return null;
  },
  returns: v.null(),
});

export const purgeRow = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (row === null || row.ownerId !== ctx.ownerId || row.deletedAt === undefined) {
      throwDomain(new NotFoundError({ message: "ゴミ箱にその記録はありません", resource: "記録" }));
    }
    await ctx.db.delete(args.rowId);
    return null;
  },
  returns: v.null(),
});

export const purgeDay = ownerMutation({
  args: { dayId: v.id("days") },
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.dayId);
    if (day === null || day.ownerId !== ctx.ownerId || day.deletedAt === undefined) {
      throwDomain(new NotFoundError({ message: "ゴミ箱にその日はありません", resource: "日" }));
    }
    await deleteDayAndRows(ctx, args.dayId);
    return null;
  },
  returns: v.null(),
});

export const purgeExpired = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const cutoff = now - TRASH_TTL_MS;
    const [expiredDays, expiredRows] = await Promise.all([
      ctx.db
        .query("days")
        .withIndex("by_deletedAt", (q) => q.lte("deletedAt", cutoff))
        .collect(),
      ctx.db
        .query("rows")
        .withIndex("by_deletedAt", (q) => q.lte("deletedAt", cutoff))
        .collect(),
    ]);
    const expiredDayIds = expiredDays.flatMap((day) =>
      day.deletedAt !== undefined && isPurgeDue(day.deletedAt, now) ? [day._id] : [],
    );
    const rowIds = new Set<Id<"rows">>();
    const childRows = await Promise.all(
      expiredDayIds.map((dayId) =>
        ctx.db
          .query("rows")
          .withIndex("by_day", (q) => q.eq("dayId", dayId))
          .collect(),
      ),
    );
    for (const rows of childRows) {
      for (const row of rows) {
        rowIds.add(row._id);
      }
    }
    for (const row of expiredRows) {
      if (row.deletedAt !== undefined && isPurgeDue(row.deletedAt, now)) {
        rowIds.add(row._id);
      }
    }
    const purgedDayIds = new Set(expiredDayIds);
    await deleteRowsByIds(ctx, rowIds);
    await Promise.all(
      [...purgedDayIds].map(async (dayId) => {
        const day = await ctx.db.get(dayId);
        if (day !== null) {
          await ctx.db.delete(dayId);
        }
      }),
    );
    return null;
  },
  returns: v.null(),
});
