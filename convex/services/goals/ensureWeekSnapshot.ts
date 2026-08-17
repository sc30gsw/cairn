import type { MutationCtx } from "../../_generated/server";
import { requireCurrentWeekStartJst } from "../../lib/dateArgs";

//* 冪等。その週のスナップショットが無く、ペース目標があるときだけ写す。既存行は上書きしない。
//? キーは必ず月曜に正規化する(upsertWeekSnapshot と同じ不変条件)。
//? 対象は今週だけ。過去週に後から現在のペース目標を写すと、その週の判定基準が事後に変わる。
export async function ensureWeekSnapshot(
  ctx: MutationCtx,
  ownerId: string,
  args: { weekStartJst: string },
): Promise<null> {
  const weekStartJst = requireCurrentWeekStartJst(args.weekStartJst);
  const existing = await ctx.db
    .query("weeklyGoals")
    .withIndex("by_owner_and_week", (q) =>
      q.eq("ownerId", ownerId).eq("weekStartJst", weekStartJst),
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
    weekStartJst,
  });
  return null;
}
