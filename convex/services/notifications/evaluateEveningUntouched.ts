import type { MutationCtx } from "../../_generated/server";
import { STATUSES } from "../../lib/domain";
import type { NotificationPayload } from "../../lib/validators";
import { getLiveDay } from "../days/getLiveDay";
import { liveRowsForDay } from "../days/liveRowsForDay";

const [, pendingStatus] = STATUSES;

export async function evaluateEveningUntouched(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<NotificationPayload | null> {
  const day = await getLiveDay(ctx, ownerId, dateJst);
  if (day !== null) {
    const rows = await liveRowsForDay(ctx, day._id);
    const pendingCount = rows.filter((row) => row.status === pendingStatus).length;
    if (pendingCount === 0) {
      return null;
    }
    return { dateJst, kind: "eveningUntouched", pendingCount, source: "day" };
  }
  const settings = await ctx.db
    .query("planSettings")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
  const forgottenTemplateId = settings?.forgottenTemplateId;
  if (forgottenTemplateId === undefined) {
    return null;
  }
  const events = await ctx.db
    .query("planTemplateEvents")
    .withIndex("by_templateId_and_startMinute", (q) => q.eq("templateId", forgottenTemplateId))
    .collect();
  const pendingCount = events.filter((event) => event.record.kind === "item").length;
  if (pendingCount === 0) {
    return null;
  }
  return { dateJst, kind: "eveningUntouched", pendingCount, source: "preset" };
}
