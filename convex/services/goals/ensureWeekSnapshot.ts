import type { MutationCtx } from "../../_generated/server";

//* 冪等。その週のスナップショットが無く、ペース目標があるときだけ写す。既存行は上書きしない。
export async function ensureWeekSnapshot(
  ctx: MutationCtx,
  ownerId: string,
  args: { weekStartJst: string },
): Promise<null> {
  const existing = await ctx.db
    .query("weeklyGoals")
    .withIndex("by_owner_and_week", (q) =>
      q.eq("ownerId", ownerId).eq("weekStartJst", args.weekStartJst),
    )
    .unique();
  if (existing !== null) {
    return null;
  }
  const pace = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "pace"))
    .first();
  if (pace === null || pace.type !== "pace") {
    return null;
  }
  await ctx.db.insert("weeklyGoals", {
    dailyFloorMinutes: pace.dailyFloorMinutes,
    days: pace.daysPerWeek,
    ownerId,
    weekStartJst: args.weekStartJst,
  });
  return null;
}
