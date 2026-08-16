import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getDayByDate, liveRowsForDay, requireEditableDay, requireLiveDay } from "./ensureCatalog";
import { ConflictError, NotFoundError, ValidationFailedError } from "./lib/errors";
import { keptRowsAfterSwitch } from "./lib/preset";
import { ownerMutation, throwDomain } from "./ownerFunctions";

async function requireOwnedRow(ctx: MutationCtx, ownerId: string, rowId: Id<"rows">) {
  const row = await ctx.db.get("rows", rowId);
  if (row === null || row.ownerId !== ownerId || row.deletedAt !== undefined) {
    throwDomain(new NotFoundError({ message: "記録が見つかりません", resource: "記録" }));
  }
  return row;
}

export const confirm = ownerMutation({
  args: {
    content: v.string(),
    minutes: v.number(),
    rowId: v.id("rows"),
  },
  handler: async (ctx, args) => {
    if (args.minutes < 0) {
      throwDomain(new ValidationFailedError({ message: "分数は0以上です" }));
    }
    const row = await requireOwnedRow(ctx, ctx.ownerId, args.rowId);
    const day = await ctx.db.get("days", row.dayId);
    if (day === null || day.deletedAt !== undefined) {
      throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
    }
    await ctx.db.patch("rows", args.rowId, {
      content: args.content,
      minutes: args.minutes,
      status: "確定",
    });
    return null;
  },
  returns: v.null(),
});

export const skip = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => {
    const row = await requireOwnedRow(ctx, ctx.ownerId, args.rowId);
    const day = await ctx.db.get("days", row.dayId);
    if (day === null || day.deletedAt !== undefined) {
      throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
    }
    await ctx.db.patch("rows", args.rowId, { status: "スキップ" });
    return null;
  },
  returns: v.null(),
});

export const add = ownerMutation({
  args: {
    content: v.string(),
    dateJst: v.string(),
    itemId: v.id("items"),
    minutes: v.number(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEditableDay(ctx, ctx.ownerId, args.dateJst, args.todayJst);
    if (args.minutes < 0) {
      throwDomain(new ValidationFailedError({ message: "分数は0以上です" }));
    }
    const item = await ctx.db.get("items", args.itemId);
    if (item === null || item.ownerId !== ctx.ownerId) {
      throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
    }
    const day = await requireLiveDay(ctx, ctx.ownerId, args.dateJst);
    const rows = await liveRowsForDay(ctx, day._id);
    const sortOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
    const rowId = await ctx.db.insert("rows", {
      content: args.content,
      dateJst: args.dateJst,
      dayId: day._id,
      itemId: args.itemId,
      minutes: args.minutes,
      ownerId: ctx.ownerId,
      sortOrder,
      status: "未着手",
    });
    return rowId;
  },
  returns: v.id("rows"),
});

export const remove = ownerMutation({
  args: { now: v.number(), rowId: v.id("rows") },
  handler: async (ctx, args) => {
    await requireOwnedRow(ctx, ctx.ownerId, args.rowId);
    await ctx.db.patch("rows", args.rowId, { deletedAt: args.now });
    return null;
  },
  returns: v.null(),
});

export const restore = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get("rows", args.rowId);
    if (row === null || row.ownerId !== ctx.ownerId || row.deletedAt === undefined) {
      throwDomain(new NotFoundError({ message: "ゴミ箱にその記録はありません", resource: "記録" }));
    }
    const day = await ctx.db.get("days", row.dayId);
    if (day !== null && day.deletedAt !== undefined) {
      throwDomain(new ConflictError({ message: "日がゴミ箱にあります。先に日を戻してください" }));
    }
    await ctx.db.patch("rows", args.rowId, { deletedAt: undefined });
    return null;
  },
  returns: v.null(),
});

export const switchPreset = ownerMutation({
  args: { dateJst: v.string(), presetId: v.id("presets"), todayJst: v.string() },
  handler: async (ctx, args) => {
    if (args.dateJst !== args.todayJst) {
      throwDomain(new ValidationFailedError({ message: "今日だけ別プリセットに切り替えられます" }));
    }
    const preset = await ctx.db.get("presets", args.presetId);
    if (preset === null || preset.ownerId !== ctx.ownerId) {
      throwDomain(
        new NotFoundError({ message: "プリセットが見つかりません", resource: "プリセット" }),
      );
    }
    const existing = await getDayByDate(ctx, ctx.ownerId, args.dateJst);
    if (existing !== null && existing.deletedAt !== undefined) {
      throwDomain(
        new NotFoundError({ message: "ゴミ箱の日です。先に戻してください", resource: "日" }),
      );
    }
    const day =
      existing ??
      (preset.lines.length === 0 ? null : await requireLiveDay(ctx, ctx.ownerId, args.dateJst));
    if (day === null) {
      throwDomain(new NotFoundError({ message: "今日の日がありません", resource: "日" }));
    }
    const rows = await liveRowsForDay(ctx, day._id);
    const kept = keptRowsAfterSwitch(rows);
    const startOrder = kept.reduce((max, row) => Math.max(max, row.sortOrder), -1);
    await Promise.all(
      rows.flatMap((row) => (row.status === "未着手" ? [ctx.db.delete("rows", row._id)] : [])),
    );
    await Promise.all(
      preset.lines.map((line, index) =>
        ctx.db.insert("rows", {
          content: line.content,
          dateJst: args.dateJst,
          dayId: day._id,
          itemId: line.itemId,
          minutes: line.minutes,
          ownerId: ctx.ownerId,
          sortOrder: startOrder + 1 + index,
          status: "未着手",
        }),
      ),
    );
    return null;
  },
  returns: v.null(),
});
