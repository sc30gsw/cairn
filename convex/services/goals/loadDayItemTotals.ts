import type { QueryCtx } from "../../_generated/server";
import { loadLiveRows } from "../rows/loadLiveRows";
import { confirmedTotalsByItem, type ItemConfirmedTotals } from "./masteryDayTotals";

export async function loadDayItemTotals(
  ctx: QueryCtx,
  ownerId: string,
  dateJst: string,
): Promise<ItemConfirmedTotals> {
  const { liveDayDates, rows } = await loadLiveRows(ctx, ownerId, { from: dateJst, to: dateJst });
  return confirmedTotalsByItem(rows, liveDayDates.has(dateJst));
}
