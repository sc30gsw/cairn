import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ConflictError, NotFoundError, ValidationFailedError } from "./lib/errors";
import { itemIdIsInUse } from "./lib/preset";
import { itemDtoValidator } from "./lib/validators";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

async function requireOwnedCategory(
  ctx: MutationCtx,
  ownerId: string,
  categoryId: Id<"categories">,
) {
  const category = await ctx.db.get(categoryId);
  if (category === null || category.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "カテゴリが見つかりません", resource: "カテゴリ" }));
  }
}

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
      .collect();
    return items.flatMap((item) => {
      if (item.categoryId === undefined) {
        return [];
      }
      return [{ _id: item._id, categoryId: item.categoryId, name: item.name }];
    });
  },
  returns: v.array(itemDtoValidator),
});

export const create = ownerMutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOwnedCategory(ctx, ctx.ownerId, args.categoryId);
    if (args.name.trim() === "") {
      throwDomain(new ValidationFailedError({ message: "項目名は必須です" }));
    }
    const duplicate = await ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ctx.ownerId).eq("name", args.name))
      .unique();
    if (duplicate !== null) {
      throwDomain(new ConflictError({ message: "同じ名前の項目があります" }));
    }
    return await ctx.db.insert("items", {
      categoryId: args.categoryId,
      name: args.name,
      ownerId: ctx.ownerId,
    });
  },
  returns: v.id("items"),
});

export const rename = ownerMutation({
  args: {
    categoryId: v.id("categories"),
    itemId: v.id("items"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (item === null || item.ownerId !== ctx.ownerId) {
      throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
    }
    await requireOwnedCategory(ctx, ctx.ownerId, args.categoryId);
    if (args.name.trim() === "") {
      throwDomain(new ValidationFailedError({ message: "項目名は必須です" }));
    }
    const duplicate = await ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ctx.ownerId).eq("name", args.name))
      .unique();
    if (duplicate !== null && duplicate._id !== args.itemId) {
      throwDomain(new ConflictError({ message: "同じ名前の項目があります" }));
    }
    await ctx.db.patch(args.itemId, { categoryId: args.categoryId, name: args.name });
    return null;
  },
  returns: v.null(),
});

export const remove = ownerMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (item === null || item.ownerId !== ctx.ownerId) {
      throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
    }
    const [rows, presets] = await Promise.all([
      ctx.db
        .query("rows")
        .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
        .collect(),
      ctx.db
        .query("presets")
        .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
        .collect(),
    ]);
    const holders = [...rows, ...presets.flatMap((preset) => preset.lines)];
    if (itemIdIsInUse(args.itemId, holders)) {
      throwDomain(new ConflictError({ message: "使っている行または雛形がある項目は消せません" }));
    }
    await ctx.db.delete(args.itemId);
    return null;
  },
  returns: v.null(),
});
