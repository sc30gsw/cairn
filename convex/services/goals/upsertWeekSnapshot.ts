import type { MutationCtx } from "../../_generated/server";
import { requireWeekStartJst } from "../../lib/dateArgs";

export type WeekSnapshotArgs = {
  dailyFloorMinutes: number;
  days: number;
  weekStartJst: string;
};

//* 週間ゴールのスナップショットを1行に保つ。同じ週に2行作らない。
//? キーは必ず月曜に正規化する。非月曜キーの行は weeklyTrend / history の exact 一致から永久に見えない。
export async function upsertWeekSnapshot(
  ctx: MutationCtx,
  ownerId: string,
  args: WeekSnapshotArgs,
): Promise<null> {
  const weekStartJst = requireWeekStartJst(args.weekStartJst);
  const existing = await ctx.db
    .query("weeklyGoals")
    .withIndex("by_owner_and_week", (q) =>
      q.eq("ownerId", ownerId).eq("weekStartJst", weekStartJst),
    )
    .unique();
  if (existing === null) {
    await ctx.db.insert("weeklyGoals", {
      dailyFloorMinutes: args.dailyFloorMinutes,
      days: args.days,
      ownerId,
      weekStartJst,
    });
    return null;
  }
  await ctx.db.patch("weeklyGoals", existing._id, {
    dailyFloorMinutes: args.dailyFloorMinutes,
    days: args.days,
  });
  return null;
}
