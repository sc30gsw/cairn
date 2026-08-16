import { v } from "convex/values";
import { flatMap, map, pipe } from "remeda";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ConflictError, NotFoundError, ValidationFailedError } from "./lib/errors";
import { applyItemOrderToList } from "./lib/itemOrder";
import { itemIdIsInUse } from "./lib/preset";
import { categoryItemOrderValidator, itemDtoValidator } from "./lib/validators";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

async function requireOwnedCategory(
  ctx: MutationCtx,
  ownerId: string,
  categoryId: Id<"categories">,
) {
  const category = await ctx.db.get("categories", categoryId);
  if (category === null || category.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "カテゴリが見つかりません", resource: "カテゴリ" }));
  }
}

async function nextSortOrder(
  ctx: MutationCtx,
  ownerId: string,
  categoryId: Id<"categories">,
): Promise<number> {
  const items = await ctx.db
    .query("items")
    .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
    .collect();
  const owned = items.filter((item) => item.ownerId === ownerId);
  if (owned.length === 0) {
    return 0;
  }
  return Math.max(...owned.map((item) => item.sortOrder ?? -1)) + 1;
}

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ctx.ownerId))
      .collect();
    return pipe(
      items,
      flatMap((item) => {
        if (item.categoryId === undefined) {
          return [];
        }
        return [
          {
            _id: item._id,
            categoryId: item.categoryId,
            name: item.name,
            sortKey: item.sortOrder ?? Number.MAX_SAFE_INTEGER,
            sortOrder: item.sortOrder,
          },
        ];
      }),
      (list) =>
        list.toSorted(
          (left, right) =>
            left.sortKey - right.sortKey || left.name.localeCompare(right.name, "ja"),
        ),
      map(({ sortKey: _sortKey, sortOrder, ...item }, index) => ({
        ...item,
        sortOrder: sortOrder ?? index,
      })),
    );
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
    const sortOrder = await nextSortOrder(ctx, ctx.ownerId, args.categoryId);
    return await ctx.db.insert("items", {
      categoryId: args.categoryId,
      name: args.name,
      ownerId: ctx.ownerId,
      sortOrder,
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
    const item = await ctx.db.get("items", args.itemId);
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
    const movedCategory = item.categoryId !== args.categoryId;
    const sortOrder = movedCategory
      ? await nextSortOrder(ctx, ctx.ownerId, args.categoryId)
      : (item.sortOrder ?? (await nextSortOrder(ctx, ctx.ownerId, args.categoryId)));
    await ctx.db.patch("items", args.itemId, {
      categoryId: args.categoryId,
      name: args.name,
      sortOrder,
    });
    return null;
  },
  returns: v.null(),
});

export const reorder = ownerMutation({
  args: {
    categoryId: v.id("categories"),
    orderedItemIds: v.array(v.id("items")),
  },
  handler: async (ctx, args) => {
    await requireOwnedCategory(ctx, ctx.ownerId, args.categoryId);
    const items = await ctx.db
      .query("items")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    const owned = items.filter((item) => item.ownerId === ctx.ownerId);
    const ownedIds = new Set(owned.map((item) => item._id));
    if (args.orderedItemIds.length !== owned.length) {
      throwDomain(new ValidationFailedError({ message: "項目の並べ替えが不正です" }));
    }
    for (const itemId of args.orderedItemIds) {
      if (!ownedIds.has(itemId)) {
        throwDomain(new ValidationFailedError({ message: "項目の並べ替えが不正です" }));
      }
    }
    await Promise.all(
      args.orderedItemIds.map((itemId, sortOrder) => ctx.db.patch("items", itemId, { sortOrder })),
    );
    return null;
  },
  returns: v.null(),
});

export const applyOrder = ownerMutation({
  args: {
    updates: v.array(categoryItemOrderValidator),
  },
  handler: async (ctx, args) => {
    if (args.updates.length === 0) {
      return null;
    }

    const seenItemIds = new Set<Id<"items">>();
    const categoryIds = [...new Set(args.updates.map((update) => update.categoryId))];
    await Promise.all(
      categoryIds.map((categoryId) => requireOwnedCategory(ctx, ctx.ownerId, categoryId)),
    );
    for (const update of args.updates) {
      for (const itemId of update.orderedItemIds) {
        if (seenItemIds.has(itemId)) {
          throwDomain(new ValidationFailedError({ message: "項目の並べ替えが不正です" }));
        }
        seenItemIds.add(itemId);
      }
    }

    const items = await ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ctx.ownerId))
      .collect();
    const itemById = new Map(items.map((item) => [item._id, item]));

    for (const update of args.updates) {
      for (const itemId of update.orderedItemIds) {
        const item = itemById.get(itemId);
        if (item === undefined) {
          throwDomain(new ValidationFailedError({ message: "項目の並べ替えが不正です" }));
        }
      }
    }

    const listDto = applyItemOrderToList(
      items.flatMap((item) =>
        item.categoryId === undefined
          ? []
          : [
              {
                _id: item._id,
                categoryId: item.categoryId,
                name: item.name,
                sortOrder: item.sortOrder ?? Number.MAX_SAFE_INTEGER,
              },
            ],
      ),
      args.updates,
    );
    const nextById = new Map(listDto.map((item) => [item._id, item]));

    await Promise.all(
      [...seenItemIds].map(async (itemId) => {
        const item = itemById.get(itemId);
        const next = nextById.get(itemId);
        if (item === undefined || next === undefined) {
          return;
        }
        if (item.categoryId === next.categoryId && item.sortOrder === next.sortOrder) {
          return;
        }
        await ctx.db.patch("items", itemId, {
          categoryId: next.categoryId,
          sortOrder: next.sortOrder,
        });
      }),
    );
    return null;
  },
  returns: v.null(),
});

export const remove = ownerMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get("items", args.itemId);
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
        .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ctx.ownerId))
        .collect(),
    ]);
    const holders = [...rows, ...presets.flatMap((preset) => preset.lines)];
    if (itemIdIsInUse(args.itemId, holders)) {
      throwDomain(new ConflictError({ message: "使っている行または雛形がある項目は消せません" }));
    }
    await ctx.db.delete("items", args.itemId);
    return null;
  },
  returns: v.null(),
});
