import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { removeForRow as removeScheduleEventsForRow } from "../boardSchedule/blocks";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";
import { endReviewForRow } from "../reviews/settleReviewRow";
import { clearTimerFields } from "./clearTimerFields";
import { requireOwnedRow } from "./requireOwnedRow";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  await withMasteryProgressDelta(ctx, ownerId, row, async () => {
    await ctx.db.patch("rows", args.rowId, { ...clearTimerFields(), deletedAt: Date.now() });
    await removeScheduleEventsForRow(ctx, ownerId, args.rowId);
  });
  await endReviewForRow(ctx, row);
  return null;
}
