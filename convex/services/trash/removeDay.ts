import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { getDayByDate } from "../days/getDayByDate";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";

export async function removeDay(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string },
): Promise<null> {
  const day = await getDayByDate(ctx, ownerId, args.dateJst);
  if (day === null || day.deletedAt !== undefined) {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  //? 日をゴミ箱に入れると配下の確定記録が丸ごと実績から外れる。外れる量は書き込みの前後を実測して
  //? 出す — 同じ暦日に別の生きた日が残っていれば実績は動かない(ADR-0007)。
  await withMasteryProgressDelta(ctx, ownerId, day, async () => {
    await ctx.db.patch("days", day._id, { deletedAt: Date.now() });
  });
  return null;
}
