import type { QueryCtx } from "../../_generated/server";
import type { CalendarFeedDto } from "../../lib/validators";
import { feedEvents } from "./feedEvents";

//? httpAction の認可: セッションが無いので、トークンから所有者を解く（CVX-04 の別形）
export async function feedByToken(
  ctx: QueryCtx,
  args: Record<"token", string>,
): Promise<CalendarFeedDto> {
  const row = await ctx.db
    .query("calendarFeedTokens")
    .withIndex("by_token", (q) => q.eq("token", args.token))
    .unique();
  if (row === null) {
    return null;
  }
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", row.ownerId))
    .collect();
  return { events: feedEvents(goals) };
}
