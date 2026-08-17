import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getDayByDate } from "../days/getDayByDate";
import { applyMasteryProgressDelta } from "../goals/applyMasteryProgressDelta";
import { requireOwnedRow } from "./requireOwnedRow";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  //? 生存判定は row.dayId ではなく暦日で引く。loadDayTotals は「その暦日に生きた日があるか」で
  //? 数えるので、ここだけ dayId 基準にするとカウンタが静かに漂流する(ADR-0007)。
  const day = await getDayByDate(ctx, ownerId, row.dateJst);
  //? ゴミ箱の日の記録はもともと実績に入っていないので、日が生きているときだけ差分が出る。
  const counted = row.status === "確定" && day !== null && day.deletedAt === undefined;
  await ctx.db.patch("rows", args.rowId, { deletedAt: Date.now() });
  await applyMasteryProgressDelta(ctx, ownerId, {
    confirmedCountDelta: counted ? -1 : 0,
    dateJst: row.dateJst,
    minutesDelta: counted ? -row.minutes : 0,
  });
  return null;
}
