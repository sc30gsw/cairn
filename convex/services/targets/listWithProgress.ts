import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireWeekStartJst } from "../../lib/dateArgs";
import { addDaysJst } from "../../lib/jst";
import type { TargetProgressDto } from "../../lib/validators";
import { liveDayDatesFrom, liveRows } from "../history/shared";
import { buildTargetProgress } from "./buildTargetProgress";

//* 今週(weekStartJst 〜 +6日)のカテゴリ別実績をターゲットに突き合わせる。
//? 週は引数で受け取る(CVX-14)が、月曜への正規化はサーバが担う。今週専用の計器で、過去週には出さない。
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
