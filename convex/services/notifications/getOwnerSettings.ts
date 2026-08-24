import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

//* 所有者の通知設定1行。無ければ null(= 通知しない。オプトインの意味論そのもの)。
export async function getOwnerSettings(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<Doc<"notificationSettings"> | null> {
  return await ctx.db
    .query("notificationSettings")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
}
