import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireValidMinutes } from "../../lib/domain";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";
import { advanceReviewForRow } from "../reviews/settleReviewRow";
import { clearTimerFields } from "./clearTimerFields";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";

export async function confirm(
  ctx: MutationCtx,
  ownerId: string,
  args: { content: string; minutes: number; rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  const content = args.content.trim();
  const minutes = requireValidMinutes(args.minutes);
  await withMasteryProgressDelta(ctx, ownerId, row, async () => {
    await ctx.db.patch("rows", args.rowId, {
      ...clearTimerFields(),
      content,
      minutes,
      status: "確定",
    });
  });
  //? 復習の記録なら、この確定で次の段階へ進む（同じトランザクション・CVX-15）
  await advanceReviewForRow(ctx, row);
  return null;
}
