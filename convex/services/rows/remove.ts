import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { removeForRow as removeScheduleEventsForRow } from "../boardSchedule/blocks";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";
import { clearTimerFields } from "./clearTimerFields";
import { requireOwnedRow } from "./requireOwnedRow";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  //? 生存判定は差分の実測に任せる。ゴミ箱の日の記録はもともと実績に入っていないので、
  //? 前後の合計が同じ = 差分なしになる(ADR-0007)。日がゴミ箱でも削除自体は許す。
  await withMasteryProgressDelta(ctx, ownerId, row, async () => {
    await ctx.db.patch("rows", args.rowId, { ...clearTimerFields(), deletedAt: Date.now() });
    await removeScheduleEventsForRow(ctx, ownerId, args.rowId);
  });
  return null;
}
