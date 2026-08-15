import { groupBy, indexBy, prop } from "remeda";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  DEFAULT_EXAM_GOAL,
  SEED_ITEMS,
  SEED_MINUTES,
  WEEKDAY_NAMES,
  seedLineNamesForWeekday,
} from "./lib/catalog";
import { SEED_CATEGORIES } from "./lib/categories";
import { NotFoundError, ValidationFailedError } from "./lib/errors";
import { compareItemsBySortOrder } from "./lib/itemSort";
import { isFutureDateJst } from "./lib/jst";
import { throwDomain } from "./ownerFunctions";

async function categoriesByName(
  ctx: MutationCtx,
  ownerId: string,
): Promise<Map<string, Id<"categories">>> {
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
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
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
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
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
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
      await ctx.db.patch(item._id, { category: undefined, categoryId });
    }),
  );
}

export async function backfillItemSortOrders(ctx: MutationCtx, ownerId: string): Promise<void> {
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const byCategory = groupBy(
    items.filter((item) => item.categoryId !== undefined),
    (item) => item.categoryId!,
  );
  await Promise.all(
    Object.values(byCategory).flatMap((categoryItems) => {
      const ordered = categoryItems.toSorted(compareItemsBySortOrder);
      return ordered.map((item, sortOrder) => {
        if (item.sortOrder === sortOrder) {
          return Promise.resolve();
        }
        return ctx.db.patch(item._id, { sortOrder });
      });
    }),
  );
}

export async function ensureCatalog(ctx: MutationCtx, ownerId: string): Promise<void> {
  const [nameToId, existingItems] = await Promise.all([
    categoriesByName(ctx, ownerId),
    ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
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
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const itemByName = indexBy(items, prop("name"));

  const existingPresets = await ctx.db
    .query("presets")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
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
              content: "",
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

  const examGoal = await ctx.db
    .query("examGoals")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
  if (examGoal === null) {
    await ctx.db.insert("examGoals", {
      examDate: DEFAULT_EXAM_GOAL.examDate,
      maxScore: DEFAULT_EXAM_GOAL.maxScore,
      minScore: DEFAULT_EXAM_GOAL.minScore,
      ownerId,
    });
  }
}

export async function getDayByDate(
  ctx: QueryCtx | MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"days"> | null> {
  const days = await ctx.db
    .query("days")
    .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", dateJst))
    .collect();
  const live = days
    .filter((day) => day.deletedAt === undefined)
    .toSorted((left, right) => left._creationTime - right._creationTime);
  if (live[0] !== undefined) {
    return live[0];
  }
  const trashed = days
    .filter((day) => day.deletedAt !== undefined)
    .toSorted((left, right) => left._creationTime - right._creationTime);
  return trashed[0] ?? null;
}

export async function collapseExtraLiveDays(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"days"> | null> {
  const days = await ctx.db
    .query("days")
    .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", dateJst))
    .collect();
  const live = days
    .filter((day) => day.deletedAt === undefined)
    .toSorted((left, right) => left._creationTime - right._creationTime);
  const winner = live[0];
  if (winner === undefined) {
    return null;
  }
  await Promise.all(live.slice(1).map((day) => ctx.db.delete(day._id)));
  return winner;
}

export async function getLiveDay(
  ctx: QueryCtx | MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"days"> | null> {
  const day = await getDayByDate(ctx, ownerId, dateJst);
  if (day === null || day.deletedAt !== undefined) {
    return null;
  }
  return day;
}

export async function liveRowsForDay(
  ctx: QueryCtx | MutationCtx,
  dayId: Id<"days">,
): Promise<Doc<"rows">[]> {
  const rows = await ctx.db
    .query("rows")
    .withIndex("by_day", (q) => q.eq("dayId", dayId))
    .collect();
  return rows
    .filter((row) => row.deletedAt === undefined)
    .toSorted((left, right) => left.sortOrder - right.sortOrder);
}

export async function requireLiveDay(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"days">> {
  const existing = await getDayByDate(ctx, ownerId, dateJst);
  if (existing !== null && existing.deletedAt !== undefined) {
    throwDomain(
      new NotFoundError({ message: "ゴミ箱の日です。先に戻してください", resource: "日" }),
    );
  }
  if (existing !== null) {
    return existing;
  }
  await ctx.db.insert("days", { dateJst, ownerId });
  const winner = await collapseExtraLiveDays(ctx, ownerId, dateJst);
  if (winner === null) {
    throwDomain(new NotFoundError({ message: "日を作れませんでした", resource: "日" }));
  }
  return winner;
}

export async function requireEditableDay(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
  todayJst: string,
): Promise<Doc<"days"> | null> {
  if (isFutureDateJst(dateJst, todayJst)) {
    throwDomain(new ValidationFailedError({ message: "未来の日は編集できません" }));
  }
  const existing = await getDayByDate(ctx, ownerId, dateJst);
  if (existing !== null && existing.deletedAt !== undefined) {
    throwDomain(
      new NotFoundError({ message: "ゴミ箱の日です。先に戻してください", resource: "日" }),
    );
  }
  return existing;
}
