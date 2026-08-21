import type { QueryCtx } from "../../_generated/server";
import { computeWeekPage } from "./shared";

export async function week(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
) {
  const page = await computeWeekPage(ctx, ownerId, args);
  return {
    days: page.days,
    events: page.events,
    volumeMinutes: page.volumeMinutes,
    weekEnd: page.weekEnd,
    weekStart: page.weekStart,
  };
}
