import type { QueryCtx } from "../../_generated/server";
import { computeYearHeatmap } from "./shared";

export async function yearHeatmap(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string },
) {
  return await computeYearHeatmap(ctx, ownerId, args.todayJst);
}
