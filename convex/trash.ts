import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { getDayByDate } from "./ensureCatalog";
import { NotFoundError } from "./lib/errors";
import { isPurgeDue } from "./lib/trash";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

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
          dateJst: row.dateJst,
          deletedAt: row.deletedAt ?? 0,
          itemName: itemById.get(row.itemId)?.name ?? "不明",
        })),
    };
  },
  returns: v.object({
    days: v.array(v.object({ _id: v.id("days"), dateJst: v.string(), deletedAt: v.number() })),
    rows: v.array(
      v.object({
        _id: v.id("rows"),
        dateJst: v.string(),
        deletedAt: v.number(),
        itemName: v.string(),
      }),
    ),
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

export const purgeExpired = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const [days, rows] = await Promise.all([
      ctx.db.query("days").collect(),
      ctx.db.query("rows").collect(),
    ]);
    const expiredDayIds = new Set(
      days.flatMap((day) =>
        day.deletedAt !== undefined && isPurgeDue(day.deletedAt, now) ? [day._id] : [],
      ),
    );
    await Promise.all([
      ...rows.flatMap((row) =>
        expiredDayIds.has(row.dayId) ||
        (row.deletedAt !== undefined && isPurgeDue(row.deletedAt, now))
          ? [ctx.db.delete(row._id)]
          : [],
      ),
      ...days.flatMap((day) => (expiredDayIds.has(day._id) ? [ctx.db.delete(day._id)] : [])),
    ]);
    return null;
  },
  returns: v.null(),
});
