import type { QueryCtx } from "../../_generated/server";

export async function list(ctx: QueryCtx, ownerId: string) {
  const [days, rows, items] = await Promise.all([
    ctx.db
      .query("days")
      .withIndex("by_owner_and_deletedAt", (q) => q.eq("ownerId", ownerId).gte("deletedAt", 0))
      .collect(),
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_deletedAt", (q) => q.eq("ownerId", ownerId).gte("deletedAt", 0))
      .collect(),
    ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);
  const itemById = new Map(items.map((item) => [item._id, item]));
  return {
    days: days
      .filter((day) => day.deletedAt !== undefined)
      .map((day) => ({ _id: day._id, dateJst: day.dateJst, deletedAt: day.deletedAt ?? 0 })),
    rows: rows
      .filter((row) => row.deletedAt !== undefined)
      .map((row) => ({
        _id: row._id,
        content: row.content,
        dateJst: row.dateJst,
        deletedAt: row.deletedAt ?? 0,
        itemName: itemById.get(row.itemId)?.name ?? "不明",
        minutes: row.minutes,
        status: row.status,
      })),
  };
}
