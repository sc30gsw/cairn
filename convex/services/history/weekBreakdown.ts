import type { QueryCtx } from "../../_generated/server";
import { computeWeekPage } from "./shared";

export async function weekBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
) {
  const page = await computeWeekPage(ctx, ownerId, args);
  return page.weekBreakdown;
}
