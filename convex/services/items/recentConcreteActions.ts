import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { requireOwnedItem } from "./helpers";

const ROWS_SCAN_LIMIT = 50;
const SUGGESTIONS_LIMIT = 5;

export async function recentConcreteActions(
  ctx: QueryCtx,
  ownerId: string,
  args: { itemId: Id<"items"> },
): Promise<string[]> {
  await requireOwnedItem(ctx, ownerId, args.itemId);
  const rows = await ctx.db
    .query("rows")
    .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
    .order("desc")
    .take(ROWS_SCAN_LIMIT);

  const dayCache = new Map<Id<"days">, Doc<"days"> | null>();
  async function isLiveDay(dayId: Id<"days">): Promise<boolean> {
    const cached = dayCache.get(dayId);
    const day = cached !== undefined ? cached : await ctx.db.get("days", dayId);
    dayCache.set(dayId, day);
    return day !== null && day.deletedAt === undefined;
  }

  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const row of rows) {
    if (row.deletedAt !== undefined || row.status !== "確定" || row.ownerId !== ownerId) {
      continue;
    }
    const content = row.content.trim();
    if (content === "" || seen.has(content)) {
      continue;
    }
    if (!(await isLiveDay(row.dayId))) {
      continue;
    }
    seen.add(content);
    suggestions.push(content);
    if (suggestions.length >= SUGGESTIONS_LIMIT) {
      break;
    }
  }
  return suggestions;
}
