import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireDateJst } from "../../lib/dateArgs";
import { getLiveDay } from "../days/getLiveDay";
import { buildDayBreakdown, liveRows } from "./shared";

export async function dayBreakdown(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
) {
  const dateJst = requireDateJst(args.dateJst);
  const todayJst = requireDateJst(args.todayJst);
  const [rows, catalog, liveDay] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", dateJst))
      .collect(),
    loadCatalog(ctx, ownerId),
    //? ゴミ箱の日は実績として数えない。他の集計と同じく deletedAt を必ず除外する(getDayByDate は復元用にゴミ箱の日も返すので使わない)。
    getLiveDay(ctx, ownerId, dateJst),
  ]);
  const liveDayDates = liveDay === null ? new Set<string>() : new Set([dateJst]);
  return buildDayBreakdown(
    dateJst,
    todayJst,
    liveRows(rows, liveDayDates),
    liveDayDates,
    catalog.itemById,
    catalog.categoryById,
    { [dateJst]: liveDay?.condition ?? null },
  );
}
