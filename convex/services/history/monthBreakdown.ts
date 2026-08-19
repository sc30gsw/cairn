import type { QueryCtx } from "../../_generated/server";
import { computeMonthBreakdown } from "./shared";

export async function monthBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; yearMonth: string },
) {
  return await computeMonthBreakdown(ctx, ownerId, args);
}
