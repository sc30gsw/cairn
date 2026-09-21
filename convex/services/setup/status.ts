import type { QueryCtx } from "../../_generated/server";
import { computeSetupStatus, type SetupStatus } from "../../lib/setupStatus";

export async function status(ctx: QueryCtx, ownerId: string): Promise<SetupStatus> {
  const [firstItem, firstTemplate, firstExamGoal, firstTarget] = await Promise.all([
    ctx.db
      .query("items")
      .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
      .first(),
    ctx.db
      .query("planTemplates")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
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
    hasExamGoal: firstExamGoal !== null,
    hasItems: firstItem !== null,
    hasPresets: firstTemplate !== null,
    hasWeeklyTargets: firstTarget !== null,
  });
}
