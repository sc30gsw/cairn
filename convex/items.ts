import { v } from "convex/values";

import { ConflictError, NotFoundError, ValidationFailedError } from "./lib/errors";
import { itemIdIsInUse } from "./lib/preset";
import { categoryValidator, itemDtoValidator } from "./lib/validators";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
      .collect();
    return items.map((item) => ({ _id: item._id, category: item.category, name: item.name }));
  },
  returns: v.array(itemDtoValidator),
});

export const create = ownerMutation({
  args: {
    category: categoryValidator,
    name: v.string(),
  },
  handler: async (ctx, args) => {
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
      category: args.category,
      name: args.name,
      ownerId: ctx.ownerId,
    });
  },
  returns: v.id("items"),
});

export const rename = ownerMutation({
  args: {
    category: categoryValidator,
    itemId: v.id("items"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (item === null || item.ownerId !== ctx.ownerId) {
      throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
    }
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
    await ctx.db.patch(args.itemId, { category: args.category, name: args.name });
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
