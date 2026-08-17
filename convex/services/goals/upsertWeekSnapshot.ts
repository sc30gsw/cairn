import type { MutationCtx } from "../../_generated/server";

export type WeekSnapshotArgs = {
  dailyFloorMinutes: number;
  days: number;
  weekStartJst: string;
};

//* 週間ゴールのスナップショットを1行に保つ。同じ週に2行作らない。
export async function upsertWeekSnapshot(
  ctx: MutationCtx,
  ownerId: string,
  args: WeekSnapshotArgs,
): Promise<null> {
  const existing = await ctx.db
    .query("weeklyGoals")
    .withIndex("by_owner_and_week", (q) =>
      q.eq("ownerId", ownerId).eq("weekStartJst", args.weekStartJst),
    )
    .unique();
  if (existing === null) {
    await ctx.db.insert("weeklyGoals", {
      dailyFloorMinutes: args.dailyFloorMinutes,
      days: args.days,
      ownerId,
      weekStartJst: args.weekStartJst,
    });
    return null;
  }
  await ctx.db.patch("weeklyGoals", existing._id, {
    dailyFloorMinutes: args.dailyFloorMinutes,
    days: args.days,
  });
  return null;
}
