import type { QueryCtx } from "../../_generated/server";
import { normalizePresetWeekdays } from "../../lib/catalog";

export async function list(ctx: QueryCtx, ownerId: string) {
  const [presets, items] = await Promise.all([
    ctx.db
      .query("presets")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);
  const itemById = new Map(items.map((item) => [item._id, item]));
  return presets
    .toSorted(
      (left, right) =>
        (normalizePresetWeekdays(left)[0] ?? 7) - (normalizePresetWeekdays(right)[0] ?? 7),
    )
    .map((preset) => {
      const weekdays = normalizePresetWeekdays(preset);
      return {
        _id: preset._id,
        lines: preset.lines.map((line) => ({
          content: line.content,
          itemId: line.itemId,
          itemName: itemById.get(line.itemId)?.name ?? "不明",
          minutes: line.minutes,
        })),
        name: preset.name,
        weekday: weekdays[0],
        weekdays,
      };
    });
}
