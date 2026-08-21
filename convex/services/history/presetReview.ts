import type { QueryCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { addDaysJst } from "../../lib/jst";
import {
  countByWeekday,
  plannedCount,
  PRESET_REVIEW_WINDOW_DAYS,
  suggestWeekdays,
} from "../../lib/presetDigest";
import type { PresetReviewDto } from "../../lib/validators";
import { liveDayDatesFrom, liveRows } from "./shared";

export async function presetReview(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string },
): Promise<PresetReviewDto> {
  const todayJst = requireDateJst(args.todayJst);
  const windowEnd = addDaysJst(todayJst, -1);
  const windowStart = addDaysJst(todayJst, -PRESET_REVIEW_WINDOW_DAYS);
  const [rows, days] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", windowStart).lte("dateJst", windowEnd),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", windowStart).lte("dateJst", windowEnd),
      )
      .collect(),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const counted = countByWeekday(liveRows(rows, liveDayDates));
  return {
    suggestions: suggestWeekdays(counted),
    weekdays: counted.map((counts) => ({
      confirmed: counts.confirmed,
      leftover: counts.leftover,
      planned: plannedCount(counts),
      skipped: counts.skipped,
      weekday: counts.weekday,
    })),
    windowEnd,
    windowStart,
  };
}
