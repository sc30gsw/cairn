import type { QueryCtx } from "../../_generated/server";

export async function list(ctx: QueryCtx, ownerId: string) {
  const [presets, items] = await Promise.all([
    ctx.db
      .query("presets")
      .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
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
}
