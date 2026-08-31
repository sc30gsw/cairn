import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";
import { clearTimerFields } from "./clearTimerFields";
import { rowDayLiveness } from "./rowDayLiveness";

export async function restore(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await ctx.db.get("rows", args.rowId);
  if (row === null || row.ownerId !== ownerId || row.deletedAt === undefined) {
    throwDomain(new NotFoundError({ message: "ゴミ箱にその記録はありません", resource: "記録" }));
  }
  if ((await rowDayLiveness(ctx, ownerId, row)) === "trashed") {
    throwDomain(new ConflictError({ message: "日がゴミ箱にあります。先に日を戻してください" }));
  }
  await withMasteryProgressDelta(ctx, ownerId, row, async () => {
    await ctx.db.patch("rows", args.rowId, { ...clearTimerFields(), deletedAt: undefined });
  });
  return null;
}
