import type { QueryCtx } from "../../_generated/server";
import { type ConfirmedDayTotals, confirmedDayTotals } from "./masteryDayTotals";

//* 1暦日ぶんの確定実績を読む。by_owner_and_date の eq なので数件で収まる(CVX-10/11)。
export async function loadDayTotals(
  ctx: QueryCtx,
  ownerId: string,
  dateJst: string,
): Promise<ConfirmedDayTotals> {
  const [rows, days] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", dateJst))
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", dateJst))
      .collect(),
  ]);
  return confirmedDayTotals(
    rows,
    days.some((day) => day.deletedAt === undefined),
  );
}
