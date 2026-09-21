import type { MutationCtx } from "../../_generated/server";
import { serverTodayJst } from "../../lib/jst";
import { materializePlanEvents, pendingPlanMaterializations } from "../plan/openDate";
import { applyToEmptyDate } from "../plan/templates";
import { loadOwnerReviewFlags } from "../reviews/loadOwnerReviewFlags";
import { dueUnplacedFlags, placeDueReviews } from "../reviews/placeDueReviews";
import { collapseExtraLiveDays } from "./collapseExtraLiveDays";
import { getDayByDate } from "./getDayByDate";
import { liveRowsForDay } from "./liveRowsForDay";

export async function openDay(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
): Promise<{ applied: boolean }> {
  const serverToday = serverTodayJst();
  if (args.dateJst !== serverToday) {
    return { applied: false };
  }
  const existing = await getDayByDate(ctx, ownerId, args.dateJst);
  if (existing !== null && existing.deletedAt !== undefined) {
    return { applied: false };
  }
  const applied = (
    await applyToEmptyDate(ctx, ownerId, {
      dateJst: args.dateJst,
      todayJst: serverToday,
    })
  ).applied;
  const [flags, pendingEvents] = await Promise.all([
    loadOwnerReviewFlags(ctx, ownerId),
    pendingPlanMaterializations(ctx, ownerId, args.dateJst),
  ]);
  const dueFlags = dueUnplacedFlags(flags, args.dateJst);
  if (pendingEvents.length === 0 && dueFlags.length === 0) {
    return { applied };
  }
  let day = existing;
  if (day === null) {
    await ctx.db.insert("days", { dateJst: args.dateJst, ownerId });
    day = await collapseExtraLiveDays(ctx, ownerId, args.dateJst);
    if (day === null) {
      return { applied };
    }
  }
  const liveRows = await liveRowsForDay(ctx, day._id);
  await materializePlanEvents(ctx, ownerId, { dateJst: args.dateJst, day });
  await placeDueReviews(ctx, ownerId, { dateJst: args.dateJst, day, flags: dueFlags, liveRows });
  return { applied };
}
