import { indexBy, prop } from "remeda";

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  SEED_CONTENT,
  SEED_ITEMS,
  SEED_MINUTES,
  WEEKDAY_NAMES,
  seedLineNamesForWeekday,
} from "../../lib/catalog";
import { SEED_CATEGORIES } from "../../lib/categories";
import { backfillItemSortOrders } from "./backfillItemSortOrders";

async function categoriesByName(
  ctx: MutationCtx,
  ownerId: string,
): Promise<Map<string, Id<"categories">>> {
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ownerId))
    .collect();
  if (existing.length === 0) {
    await Promise.all(
      SEED_CATEGORIES.map((category) =>
        ctx.db.insert("categories", {
          name: category.name,
          ownerId,
          sortOrder: category.sortOrder,
        }),
      ),
    );
  }
  const categories = await ctx.db
    .query("categories")
    .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ownerId))
    .collect();
  return new Map(
    Object.entries(indexBy(categories, prop("name"))).map(([name, category]) => [
      name,
      category._id,
    ]),
  );
}

async function backfillItemCategories(
  ctx: MutationCtx,
  ownerId: string,
  nameToId: Map<string, Id<"categories">>,
): Promise<void> {
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
    .collect();
  await Promise.all(
    items.map(async (item) => {
      if (item.categoryId !== undefined) {
        return;
      }
      const name = item.category;
      if (name === undefined) {
        return;
      }
      const categoryId = nameToId.get(name);
      if (categoryId === undefined) {
        return;
      }
      await ctx.db.patch("items", item._id, { category: undefined, categoryId });
    }),
  );
}

export async function ensureCatalog(ctx: MutationCtx, ownerId: string): Promise<void> {
  const [nameToId, existingItems] = await Promise.all([
    categoriesByName(ctx, ownerId),
    ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);
  if (existingItems.length === 0) {
    const sortOrderByCategory = new Map<Id<"categories">, number>();
    await Promise.all(
      SEED_ITEMS.map((item) => {
        const categoryId = nameToId.get(item.category);
        if (categoryId === undefined) {
          return Promise.resolve();
        }
        const sortOrder = sortOrderByCategory.get(categoryId) ?? 0;
        sortOrderByCategory.set(categoryId, sortOrder + 1);
        return ctx.db.insert("items", {
          categoryId,
          name: item.name,
          ownerId,
          sortOrder,
        });
      }),
    );
  } else {
    await backfillItemCategories(ctx, ownerId, nameToId);
  }

  await backfillItemSortOrders(ctx, ownerId);

  const items = await ctx.db
    .query("items")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
    .collect();
  const itemByName = indexBy(items, prop("name"));

  const existingPresets = await ctx.db
    .query("presets")
    .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId))
    .collect();
  if (existingPresets.length === 0) {
    await Promise.all(
      WEEKDAY_NAMES.map((name, weekday) => {
        const lines = seedLineNamesForWeekday(weekday).flatMap((itemName) => {
          const item = itemByName[itemName];
          if (item === undefined) {
            return [];
          }
          return [
            {
              content: SEED_CONTENT[itemName as keyof typeof SEED_CONTENT],
              itemId: item._id,
              minutes: SEED_MINUTES[itemName as keyof typeof SEED_MINUTES],
            },
          ];
        });
        return ctx.db.insert("presets", {
          lines,
          name,
          ownerId,
          weekday,
        });
      }),
    );
  }
}
