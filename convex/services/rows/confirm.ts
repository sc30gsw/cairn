import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { assertConcreteAction } from "../../lib/concreteAction";
import { MINUTES_MIN_MESSAGE } from "../../lib/domain";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedRow } from "./requireOwnedRow";

export async function confirm(
  ctx: MutationCtx,
  ownerId: string,
  args: { content: string; minutes: number; rowId: Id<"rows"> },
): Promise<null> {
  //? 認可を先に確定させる(updateObstacle と同じ順序)
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  const day = await ctx.db.get("days", row.dayId);
  if (day === null || day.deletedAt !== undefined) {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  const content = args.content.trim();
  assertConcreteAction(content);
  if (args.minutes < 0) {
    throwDomain(new ValidationFailedError({ message: MINUTES_MIN_MESSAGE }));
  }
  await ctx.db.patch("rows", args.rowId, {
    content,
    minutes: args.minutes,
    status: "確定",
  });
  return null;
}
