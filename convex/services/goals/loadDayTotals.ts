import type { QueryCtx } from "../../_generated/server";
import { loadLiveRows } from "../rows/loadLiveRows";
import { type ConfirmedDayTotals, confirmedDayTotals } from "./masteryDayTotals";

//* 1暦日ぶんの確定実績を読む。範囲を1日に閉じた loadLiveRows なので数件で収まる(CVX-10/11)。
export async function loadDayTotals(
  ctx: QueryCtx,
  ownerId: string,
  dateJst: string,
): Promise<ConfirmedDayTotals> {
  const { liveDayDates, rows } = await loadLiveRows(ctx, ownerId, { from: dateJst, to: dateJst });
  return confirmedDayTotals(rows, liveDayDates.has(dateJst));
}
