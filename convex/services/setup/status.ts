import type { QueryCtx } from "../../_generated/server";
import { computeSetupStatus, type SetupStatus } from "../../lib/setupStatus";

export async function status(ctx: QueryCtx, ownerId: string): Promise<SetupStatus> {
  const [firstItem, firstPreset, firstExamGoal, firstTarget] = await Promise.all([
    ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
      .first(),
    ctx.db
      .query("presets")
      .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId))
      .first(),
    ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "exam"))
      .first(),
    ctx.db
      .query("targets")
      .withIndex("by_owner_and_category", (q) => q.eq("ownerId", ownerId))
      .first(),
  ]);

  return computeSetupStatus({
    examGoalCount: firstExamGoal === null ? 0 : 1,
    itemCount: firstItem === null ? 0 : 1,
    presetCount: firstPreset === null ? 0 : 1,
    targetCount: firstTarget === null ? 0 : 1,
  });
}
