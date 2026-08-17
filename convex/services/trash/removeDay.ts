import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { getDayByDate } from "../days/getDayByDate";
import { applyMasteryProgressDelta } from "../goals/applyMasteryProgressDelta";
import { loadDayTotals } from "../goals/loadDayTotals";

export async function removeDay(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string },
): Promise<null> {
  const day = await getDayByDate(ctx, ownerId, args.dateJst);
  if (day === null || day.deletedAt !== undefined) {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  //? 日をゴミ箱に入れると配下の確定記録が丸ごと実績から外れる。外れる量を先に数える(ADR-0007)。
  const before = await loadDayTotals(ctx, ownerId, args.dateJst);
  await ctx.db.patch("days", day._id, { deletedAt: Date.now() });
  await applyMasteryProgressDelta(ctx, ownerId, {
    confirmedCountDelta: -before.confirmedCount,
    dateJst: args.dateJst,
    minutesDelta: -before.confirmedMinutes,
  });
  return null;
}
