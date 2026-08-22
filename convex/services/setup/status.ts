import type { QueryCtx } from "../../_generated/server";
import { computeSetupStatus, type SetupStatus } from "../../lib/setupStatus";

export async function status(ctx: QueryCtx, ownerId: string): Promise<SetupStatus> {
  const [items, presets, examGoals, targets] = await Promise.all([
    ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("presets")
      .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "exam"))
      .collect(),
    ctx.db
      .query("targets")
      .withIndex("by_owner_and_category", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);

  return computeSetupStatus({
    examGoalCount: examGoals.length,
    itemCount: items.length,
    presetCount: presets.length,
    targetCount: targets.length,
  });
}
