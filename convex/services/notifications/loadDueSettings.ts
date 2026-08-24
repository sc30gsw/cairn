import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

//* 固定時刻トリガーの回は「有効な全所有者」、それ以外の回は「夜の時刻が一致する所有者」だけ。
//? どちらも index 条件つき。テーブル全体の無条件 collect はしない(CVX-11)。.filter は使わない(CVX-10)。
export async function loadDueSettings(
  ctx: MutationCtx,
  args: { fixedDue: boolean; hour: number },
): Promise<Doc<"notificationSettings">[]> {
  if (args.fixedDue) {
    return await ctx.db
      .query("notificationSettings")
      .withIndex("by_enabled_and_eveningHourJst", (q) => q.eq("enabled", true))
      .collect();
  }
  return await ctx.db
    .query("notificationSettings")
    .withIndex("by_enabled_and_eveningHourJst", (q) =>
      q.eq("enabled", true).eq("eveningHourJst", args.hour),
    )
    .collect();
}
