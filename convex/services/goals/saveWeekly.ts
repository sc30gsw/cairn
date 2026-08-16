import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function saveWeekly(
  ctx: MutationCtx,
  ownerId: string,
  args: { minutes: number; weekStartJst: string },
): Promise<null> {
  if (args.minutes < 0) {
    throwDomain(new ValidationFailedError({ message: "週間ゴールは0分以上です" }));
  }
  const existing = await ctx.db
    .query("weeklyGoals")
    .withIndex("by_owner_and_week", (q) =>
      q.eq("ownerId", ownerId).eq("weekStartJst", args.weekStartJst),
    )
    .unique();
  if (existing === null) {
    await ctx.db.insert("weeklyGoals", {
      minutes: args.minutes,
      ownerId,
      weekStartJst: args.weekStartJst,
    });
  } else {
    await ctx.db.patch("weeklyGoals", existing._id, { minutes: args.minutes });
  }
  return null;
}
