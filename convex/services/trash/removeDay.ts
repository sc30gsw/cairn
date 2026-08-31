import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { getDayByDate } from "../days/getDayByDate";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";

export async function removeDay(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string },
): Promise<null> {
  const day = await getDayByDate(ctx, ownerId, args.dateJst);
  if (day === null || day.deletedAt !== undefined) {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  await withMasteryProgressDelta(ctx, ownerId, day, async () => {
    await ctx.db.patch("days", day._id, { deletedAt: Date.now() });
  });
  return null;
}
