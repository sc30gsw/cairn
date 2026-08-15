import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ConflictError, NotFoundError, ValidationFailedError } from "./lib/errors";
import { presetDtoValidator } from "./lib/validators";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

const lineValidator = v.object({
  content: v.string(),
  itemId: v.id("items"),
  minutes: v.number(),
});

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => {
    const [presets, items] = await Promise.all([
      ctx.db
        .query("presets")
        .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
        .collect(),
      ctx.db
        .query("items")
        .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
        .collect(),
    ]);
    const itemById = new Map(items.map((item) => [item._id, item]));
    return presets
      .toSorted((left, right) => left.weekday - right.weekday)
      .map((preset) => ({
        _id: preset._id,
        lines: preset.lines.map((line) => ({
          content: line.content,
          itemId: line.itemId,
          itemName: itemById.get(line.itemId)?.name ?? "不明",
          minutes: line.minutes,
        })),
        name: preset.name,
        weekday: preset.weekday,
      }));
  },
  returns: v.array(presetDtoValidator),
});

async function assertWeekdayFree(
  ctx: MutationCtx,
  ownerId: string,
  weekday: number,
  ignoreId?: Id<"presets">,
) {
  const existing = await ctx.db
    .query("presets")
    .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId).eq("weekday", weekday))
    .collect();
  if (existing.some((preset) => preset._id !== ignoreId)) {
    throwDomain(new ConflictError({ message: "各曜日はプリセット1つだけです" }));
  }
}

export const create = ownerMutation({
  args: {
    lines: v.array(lineValidator),
    name: v.string(),
    weekday: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.weekday < 0 || args.weekday > 6) {
      throwDomain(new ValidationFailedError({ message: "曜日が不正です" }));
    }
    await assertWeekdayFree(ctx, ctx.ownerId, args.weekday);
    return await ctx.db.insert("presets", {
      lines: args.lines,
      name: args.name,
      ownerId: ctx.ownerId,
      weekday: args.weekday,
    });
  },
  returns: v.id("presets"),
});

export const update = ownerMutation({
  args: {
    lines: v.array(lineValidator),
    name: v.string(),
    presetId: v.id("presets"),
    weekday: v.number(),
  },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.presetId);
    if (preset === null || preset.ownerId !== ctx.ownerId) {
      throwDomain(
        new NotFoundError({ message: "プリセットが見つかりません", resource: "プリセット" }),
      );
    }
    if (args.weekday < 0 || args.weekday > 6) {
      throwDomain(new ValidationFailedError({ message: "曜日が不正です" }));
    }
    await assertWeekdayFree(ctx, ctx.ownerId, args.weekday, args.presetId);
    await ctx.db.patch(args.presetId, {
      lines: args.lines,
      name: args.name,
      weekday: args.weekday,
    });
    return null;
  },
  returns: v.null(),
});

export const remove = ownerMutation({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.presetId);
    if (preset === null || preset.ownerId !== ctx.ownerId) {
      throwDomain(
        new NotFoundError({ message: "プリセットが見つかりません", resource: "プリセット" }),
      );
    }
    await ctx.db.delete(args.presetId);
    return null;
  },
  returns: v.null(),
});
