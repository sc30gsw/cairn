import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { MINUTES_MIN_MESSAGE } from "../../lib/domain";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";

export async function confirm(
  ctx: MutationCtx,
  ownerId: string,
  args: { content: string; minutes: number; rowId: Id<"rows"> },
): Promise<null> {
  //? 認可を先に確定させる(updateObstacle と同じ順序)
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  //? 日の生存判定は暦日で引く共通規則(rowDayLiveness)。remove / restore / skip と同じ規則。
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  const content = args.content.trim();
  if (args.minutes < 0) {
    throwDomain(new ValidationFailedError({ message: MINUTES_MIN_MESSAGE }));
  }
  //? 確定分数を動かすので、書き込みの前後を実測して習得目標のカウンタを動かす(CVX-15 / ADR-0007)。
  await withMasteryProgressDelta(ctx, ownerId, row, async () => {
    await ctx.db.patch("rows", args.rowId, {
      content,
      minutes: args.minutes,
      status: "確定",
    });
  });
  return null;
}
