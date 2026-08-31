import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireWeekStartJst } from "../../lib/dateArgs";
import { addDaysJst } from "../../lib/jst";
import type { TargetProgressDto } from "../../lib/validators";
import { liveDayDatesFrom, liveRows } from "../history/shared";
import { buildTargetProgress } from "./buildTargetProgress";

export async function listWithProgress(
  ctx: QueryCtx,
  ownerId: string,
  args: { weekStartJst: string },
): Promise<TargetProgressDto[]> {
  const weekStart = requireWeekStartJst(args.weekStartJst);
  const weekEnd = addDaysJst(weekStart, 6);
  const [targets, rows, days, catalog] = await Promise.all([
    ctx.db
      .query("targets")
      .withIndex("by_owner_and_category", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", weekStart).lte("dateJst", weekEnd),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", weekStart).lte("dateJst", weekEnd),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);
  return buildTargetProgress({
    categoryById: catalog.categoryById,
    itemById: catalog.itemById,
    rows: liveRows(rows, liveDayDatesFrom(days)),
    targets,
  });
}
