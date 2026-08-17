import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getDayByDate } from "../days/getDayByDate";

//* 記録が実績に入るかを決める「日の生存」判定。記録の書き込み経路はここだけを見る。
//? 判定は row.dayId ではなく暦日で引く。loadLiveRows / loadDayTotals は「その暦日に生きた日が
//? あるか」で数えるので、経路ごとに dayId 基準を混ぜるとカウンタが静かに漂流する(ADR-0007)。
//? trashed(暦日の日がゴミ箱)と missing(そもそも日がない)は復元の可否が違うので分けて返す。
export type RowDayLiveness = "live" | "missing" | "trashed";

export async function rowDayLiveness(
  ctx: MutationCtx,
  ownerId: string,
  row: Pick<Doc<"rows">, "dateJst">,
): Promise<RowDayLiveness> {
  const day = await getDayByDate(ctx, ownerId, row.dateJst);
  if (day === null) {
    return "missing";
  }
  return day.deletedAt === undefined ? "live" : "trashed";
}
