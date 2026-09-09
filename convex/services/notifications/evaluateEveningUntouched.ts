import type { MutationCtx } from "../../_generated/server";
import { STATUSES } from "../../lib/domain";
import { weekdayFromDateJst } from "../../lib/jst";
import type { NotificationPayload } from "../../lib/validators";
import { getLiveDay } from "../days/getLiveDay";
import { liveRowsForDay } from "../days/liveRowsForDay";
import { findUniquePresetForWeekday } from "../presets/helpers";

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
  const presets = await ctx.db
    .query("presets")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const preset = findUniquePresetForWeekday(presets, weekdayFromDateJst(dateJst));
  if (preset === undefined || preset.lines.length === 0) {
    return null;
  }
  return { dateJst, kind: "eveningUntouched", pendingCount: preset.lines.length, source: "preset" };
}
