import { v } from "convex/values";

import { ConflictError, NotFoundError, ValidationFailedError } from "./lib/errors";
import { categoryDtoValidator } from "./lib/validators";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ctx.ownerId))
      .collect();
    return categories.map((category) => ({
      _id: category._id,
      name: category.name,
      sortOrder: category.sortOrder,
    }));
  },
  returns: v.array(categoryDtoValidator),
});

export const create = ownerMutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name === "") {
      throwDomain(new ValidationFailedError({ message: "カテゴリ名は必須です" }));
    }
    const duplicate = await ctx.db
      .query("categories")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ctx.ownerId).eq("name", name))
      .unique();
    if (duplicate !== null) {
      throwDomain(new ConflictError({ message: "同じ名前のカテゴリがあります" }));
    }
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ctx.ownerId))
      .collect();
    const last = existing[existing.length - 1];
    return await ctx.db.insert("categories", {
      name,
      ownerId: ctx.ownerId,
      sortOrder: last === undefined ? 0 : last.sortOrder + 1,
    });
  },
  returns: v.id("categories"),
});

export const rename = ownerMutation({
  args: { categoryId: v.id("categories"), name: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db.get("categories", args.categoryId);
    if (category === null || category.ownerId !== ctx.ownerId) {
      throwDomain(new NotFoundError({ message: "カテゴリが見つかりません", resource: "カテゴリ" }));
    }
    const name = args.name.trim();
    if (name === "") {
      throwDomain(new ValidationFailedError({ message: "カテゴリ名は必須です" }));
    }
    const duplicate = await ctx.db
      .query("categories")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ctx.ownerId).eq("name", name))
      .unique();
    if (duplicate !== null && duplicate._id !== args.categoryId) {
      throwDomain(new ConflictError({ message: "同じ名前のカテゴリがあります" }));
    }
    await ctx.db.patch("categories", args.categoryId, { name });
    return null;
  },
  returns: v.null(),
});

export const remove = ownerMutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get("categories", args.categoryId);
    if (category === null || category.ownerId !== ctx.ownerId) {
      throwDomain(new NotFoundError({ message: "カテゴリが見つかりません", resource: "カテゴリ" }));
    }
    const items = await ctx.db
      .query("items")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    if (items.length > 0) {
      throwDomain(new ConflictError({ message: "項目が残っているカテゴリは消せません" }));
    }
    await ctx.db.delete("categories", args.categoryId);
    return null;
  },
  returns: v.null(),
});
