import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { liveDayDatesFrom, liveRows } from "../history/shared";

export type LiveRowsRange = {
  from: string;
  to?: string;
};

export async function loadLiveRows(
  ctx: QueryCtx,
  ownerId: string,
  range: LiveRowsRange,
): Promise<{ liveDayDates: ReadonlySet<string>; rows: Doc<"rows">[] }> {
  const { from, to } = range;
  const [rows, days] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => {
        const lower = q.eq("ownerId", ownerId).gte("dateJst", from);
        return to === undefined ? lower : lower.lte("dateJst", to);
      })
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) => {
        const lower = q.eq("ownerId", ownerId).gte("dateJst", from);
        return to === undefined ? lower : lower.lte("dateJst", to);
      })
      .collect(),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  return { liveDayDates, rows: liveRows(rows, liveDayDates) };
}
