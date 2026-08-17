import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { applyMasteryProgressDelta } from "../goals/applyMasteryProgressDelta";
import { requireOwnedRow } from "./requireOwnedRow";

export async function skip(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  const day = await ctx.db.get("days", row.dayId);
  if (day === null || day.deletedAt !== undefined) {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  const wasConfirmed = row.status === "確定";
  await ctx.db.patch("rows", args.rowId, { status: "スキップ" });
  //? 確定をスキップに戻すと確定分数が減る。未着手からのスキップは実績を動かさない(ADR-0007)。
  await applyMasteryProgressDelta(ctx, ownerId, {
    confirmedCountDelta: wasConfirmed ? -1 : 0,
    dateJst: row.dateJst,
    minutesDelta: wasConfirmed ? -row.minutes : 0,
  });
  return null;
}
