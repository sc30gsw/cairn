import type { MutationCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import type { Condition } from "../../lib/domain";
import { requireEditableDay } from "./requireEditableDay";
import { requireLiveDay } from "./requireLiveDay";

export async function setCondition(
  ctx: MutationCtx,
  ownerId: string,
  args: { condition: Condition; dateJst: string; todayJst: string },
): Promise<null> {
  const dateJst = requireDateJst(args.dateJst);
  const todayJst = requireDateJst(args.todayJst);
  await requireEditableDay(ctx, ownerId, dateJst, todayJst);
  const day = await requireLiveDay(ctx, ownerId, dateJst);
  await ctx.db.patch("days", day._id, { condition: args.condition });
  return null;
}
