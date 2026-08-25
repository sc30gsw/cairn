import type { MutationCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { requireEditableDay } from "./requireEditableDay";
import { requireLiveDay } from "./requireLiveDay";

export async function setMemo(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; memo: string; todayJst: string },
): Promise<null> {
  const dateJst = requireDateJst(args.dateJst);
  const todayJst = requireDateJst(args.todayJst);
  const existing = await requireEditableDay(ctx, ownerId, dateJst, todayJst);
  if (args.memo.trim() === "") {
    if (existing === null) {
      return null;
    }
    await ctx.db.patch("days", existing._id, { memo: undefined });
    return null;
  }
  const day = existing ?? (await requireLiveDay(ctx, ownerId, dateJst));
  await ctx.db.patch("days", day._id, { memo: args.memo });
  return null;
}
