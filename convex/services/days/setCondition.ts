import type { MutationCtx } from "../../_generated/server";
import type { Condition } from "../../lib/domain";
import { requireEditableDay } from "./requireEditableDay";
import { requireLiveDay } from "./requireLiveDay";

export async function setCondition(
  ctx: MutationCtx,
  ownerId: string,
  args: { condition: Condition; dateJst: string; todayJst: string },
): Promise<null> {
  await requireEditableDay(ctx, ownerId, args.dateJst, args.todayJst);
  const day = await requireLiveDay(ctx, ownerId, args.dateJst);
  await ctx.db.patch("days", day._id, { condition: args.condition });
  return null;
}
