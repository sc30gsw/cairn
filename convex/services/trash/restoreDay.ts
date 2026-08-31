import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";

export async function restoreDay(
  ctx: MutationCtx,
  ownerId: string,
  args: { dayId: Id<"days"> },
): Promise<null> {
  const day = await ctx.db.get("days", args.dayId);
  if (day === null || day.ownerId !== ownerId || day.deletedAt === undefined) {
    throwDomain(new NotFoundError({ message: "ゴミ箱にその日はありません", resource: "日" }));
  }
  await withMasteryProgressDelta(ctx, ownerId, day, async () => {
    await ctx.db.patch("days", args.dayId, { deletedAt: undefined });
  });
  return null;
}
