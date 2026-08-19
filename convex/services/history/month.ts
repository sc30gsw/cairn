import type { QueryCtx } from "../../_generated/server";
import { computeMonthBreakdown } from "./shared";

export async function month(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; yearMonth: string },
) {
  const breakdown = await computeMonthBreakdown(ctx, ownerId, args);
  return { days: breakdown.days };
}
