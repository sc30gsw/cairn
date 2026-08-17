import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function purgeRow(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await ctx.db.get("rows", args.rowId);
  if (row === null || row.ownerId !== ownerId || row.deletedAt === undefined) {
    throwDomain(new NotFoundError({ message: "ゴミ箱にその記録はありません", resource: "記録" }));
  }
  //? ここで消せるのは deletedAt 付きの記録だけで、confirmedDayTotals はそれを数えない。前後どちらも
  //? 実績の外なので差分ゼロが証明でき、実測(withMasteryProgressDelta)を挟む必要がない(ADR-0007)。
  await ctx.db.delete("rows", args.rowId);
  return null;
}
