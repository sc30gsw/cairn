import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { liveDayDatesFrom, liveRows } from "../history/shared";

export type LiveRowsRange = {
  from: string;
  to?: string;
};

//* 所有者の暦日範囲から「生きた記録」を読む唯一の入口(loadDayItemTotals と再計算が共有する)。
//? 日がゴミ箱にある暦日は丸ごと外す — history/shared.ts の liveRows と同じ規則。範囲は index で
//? 絞るので .filter は使わない(CVX-10)。1日あたり数件なので collect で足りる(CVX-11)。
//? to を省くと下端だけの開いた範囲(目標作成日以降の全期間)になる。
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
