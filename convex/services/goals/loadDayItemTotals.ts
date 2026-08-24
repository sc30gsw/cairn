import type { QueryCtx } from "../../_generated/server";
import { loadLiveRows } from "../rows/loadLiveRows";
import { confirmedTotalsByItem, type ItemConfirmedTotals } from "./masteryDayTotals";

//* 1暦日ぶんの確定実績を項目別に読む。範囲を1日に閉じた loadLiveRows なので数件で収まる(CVX-10/11)。
//? 読み取り量は日合計だった頃と同じ。細かくなるのは数え方だけ(#53 §6.2)。
export async function loadDayItemTotals(
  ctx: QueryCtx,
  ownerId: string,
  dateJst: string,
): Promise<ItemConfirmedTotals> {
  const { liveDayDates, rows } = await loadLiveRows(ctx, ownerId, { from: dateJst, to: dateJst });
  return confirmedTotalsByItem(rows, liveDayDates.has(dateJst));
}
