import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  collapseExtraLiveDays,
  ensureCatalog,
  getDayByDate,
  getLiveDay,
  liveRowsForDay,
  requireEditableDay,
  requireLiveDay,
} from "./ensureCatalog";
import { loadCatalog } from "./lib/catalogLoader";
import { categoryFields } from "./lib/categoryFields";
import { isFutureDateJst, weekdayFromDateJst } from "./lib/jst";
import { formatShareMarkdown } from "./lib/share";
import { conditionValidator, dayPageValidator, presetApplyResultValidator } from "./lib/validators";
import { confirmedVolumeMinutes } from "./lib/volume";
import { ownerMutation, ownerQuery } from "./ownerFunctions";

export async function toRowDtos(ctx: QueryCtx | MutationCtx, ownerId: string, rows: Doc<"rows">[]) {
  const catalog = await loadCatalog(ctx, ownerId);
  return rows.map((row) => {
    const item = catalog.itemById.get(row.itemId);
    const fields = categoryFields(item, catalog.categoryById);
    return {
      _id: row._id,
      category: fields.category,
      categorySortOrder: fields.categorySortOrder,
      content: row.content,
      itemId: row.itemId,
      itemName: item?.name ?? "不明",
      minutes: row.minutes,
      sortOrder: row.sortOrder,
      status: row.status,
    };
  });
}

export const open = ownerMutation({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => {
    await ensureCatalog(ctx, ctx.ownerId);
    if (isFutureDateJst(args.dateJst, args.todayJst)) {
      return { applied: false };
    }
    const existing = await getDayByDate(ctx, ctx.ownerId, args.dateJst);
    if (existing !== null && existing.deletedAt !== undefined) {
      return { applied: false };
    }
    const weekday = weekdayFromDateJst(args.dateJst);
    const preset = await ctx.db
      .query("presets")
      .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ctx.ownerId).eq("weekday", weekday))
      .unique();
    if (preset === null || preset.lines.length === 0) {
      return { applied: false };
    }
    let day = existing;
    if (day === null) {
      await ctx.db.insert("days", { dateJst: args.dateJst, ownerId: ctx.ownerId });
      day = await collapseExtraLiveDays(ctx, ctx.ownerId, args.dateJst);
      if (day === null) {
        return { applied: false };
      }
    }
    await ctx.db.patch(day._id, { dateJst: day.dateJst });
    const liveRows = await liveRowsForDay(ctx, day._id);
    if (liveRows.length > 0) {
      return { applied: false };
    }
    await Promise.all(
      preset.lines.map((line, index) =>
        ctx.db.insert("rows", {
          content: line.content,
          dateJst: args.dateJst,
          dayId: day._id,
          itemId: line.itemId,
          minutes: line.minutes,
          ownerId: ctx.ownerId,
          sortOrder: index,
          status: "未着手",
        }),
      ),
    );
    return { applied: true };
  },
  returns: presetApplyResultValidator,
});

export const get = ownerQuery({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => {
    const day = await getLiveDay(ctx, ctx.ownerId, args.dateJst);
    const rows = day === null ? [] : await liveRowsForDay(ctx, day._id);
    const rowDtos = await toRowDtos(ctx, ctx.ownerId, rows);
    return {
      dateJst: args.dateJst,
      day:
        day === null
          ? null
          : {
              _id: day._id,
              condition: day.condition ?? null,
              dateJst: day.dateJst,
              memo: day.memo ?? null,
            },
      isFuture: isFutureDateJst(args.dateJst, args.todayJst),
      rows: rowDtos,
      shareMarkdown: formatShareMarkdown(rowDtos),
      volumeMinutes: confirmedVolumeMinutes(rowDtos),
    };
  },
  returns: dayPageValidator,
});

export const setCondition = ownerMutation({
  args: {
    condition: conditionValidator,
    dateJst: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEditableDay(ctx, ctx.ownerId, args.dateJst, args.todayJst);
    const day = await requireLiveDay(ctx, ctx.ownerId, args.dateJst);
    await ctx.db.patch(day._id, { condition: args.condition });
    return null;
  },
  returns: v.null(),
});

export const setMemo = ownerMutation({
  args: { dateJst: v.string(), memo: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => {
    const existing = await requireEditableDay(ctx, ctx.ownerId, args.dateJst, args.todayJst);
    if (args.memo.trim() === "") {
      if (existing === null) {
        return null;
      }
      await ctx.db.patch(existing._id, { memo: undefined });
      return null;
    }
    const day = existing ?? (await requireLiveDay(ctx, ctx.ownerId, args.dateJst));
    await ctx.db.patch(day._id, { memo: args.memo });
    return null;
  },
  returns: v.null(),
});
