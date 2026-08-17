import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";

export async function skip(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  //? 日の生存判定は暦日で引く共通規則(rowDayLiveness)。confirm と同じ規則・同じエラー。
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  //? 確定をスキップに戻すと確定分数が減る。差分は書き込みの前後を実測して出す(ADR-0007)。
  await withMasteryProgressDelta(ctx, ownerId, row, async () => {
    await ctx.db.patch("rows", args.rowId, { status: "スキップ" });
  });
  return null;
}
