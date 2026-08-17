import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { getDayByDate } from "../days/getDayByDate";
import { applyMasteryProgressDelta } from "../goals/applyMasteryProgressDelta";

export async function restore(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await ctx.db.get("rows", args.rowId);
  if (row === null || row.ownerId !== ownerId || row.deletedAt === undefined) {
    throwDomain(new NotFoundError({ message: "ゴミ箱にその記録はありません", resource: "記録" }));
  }
  //? 生存判定は row.dayId ではなく暦日で引く(remove と同じ理由 — loadDayTotals と規則を1本化する)。
  const day = await getDayByDate(ctx, ownerId, row.dateJst);
  if (day !== null && day.deletedAt !== undefined) {
    throwDomain(new ConflictError({ message: "日がゴミ箱にあります。先に日を戻してください" }));
  }
  //? ここまで来たら日は生きている。確定記録が実績に戻るので、その分を足し直す(ADR-0007)。
  const counted = row.status === "確定" && day !== null;
  await ctx.db.patch("rows", args.rowId, { deletedAt: undefined });
  await applyMasteryProgressDelta(ctx, ownerId, {
    confirmedCountDelta: counted ? 1 : 0,
    dateJst: row.dateJst,
    minutesDelta: counted ? row.minutes : 0,
  });
  return null;
}
