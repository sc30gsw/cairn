import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  DEFAULT_EXAM_GOAL,
  SEED_ITEMS,
  SEED_MINUTES,
  WEEKDAY_NAMES,
  seedLineNamesForWeekday,
} from "./lib/catalog";
import { NotFoundError } from "./lib/errors";
import { throwDomain } from "./ownerFunctions";

export async function ensureCatalog(ctx: MutationCtx, ownerId: string): Promise<void> {
  const existingItems = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  if (existingItems.length === 0) {
    await Promise.all(
      SEED_ITEMS.map((item) =>
        ctx.db.insert("items", {
          category: item.category,
          name: item.name,
          ownerId,
        }),
      ),
    );
  }

  const items = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const itemByName = new Map(items.map((item) => [item.name, item]));

  const existingPresets = await ctx.db
    .query("presets")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  if (existingPresets.length === 0) {
    await Promise.all(
      WEEKDAY_NAMES.map((name, weekday) => {
        const lines = seedLineNamesForWeekday(weekday).flatMap((itemName) => {
          const item = itemByName.get(itemName);
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
  return await ctx.db
    .query("days")
    .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", dateJst))
    .unique();
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
  const id = await ctx.db.insert("days", { dateJst, ownerId });
  const created = await ctx.db.get(id);
  if (created === null) {
    throwDomain(new NotFoundError({ message: "日を作れませんでした", resource: "日" }));
  }
  return created;
}
