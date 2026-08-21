import type { QueryCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { addDaysJst, mondayOfWeek } from "../../lib/jst";
import {
  countByWeekday,
  plannedCount,
  PRESET_REVIEW_WINDOW_DAYS,
  suggestWeekdays,
} from "../../lib/presetDigest";
import type { PresetReviewDto } from "../../lib/validators";
import { listWithProgress } from "../targets/listWithProgress";
import { liveDayDatesFrom, liveRows } from "./shared";

export async function presetReview(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string },
): Promise<PresetReviewDto> {
  const todayJst = requireDateJst(args.todayJst);
  const windowEnd = addDaysJst(todayJst, -1);
  const windowStart = addDaysJst(todayJst, -PRESET_REVIEW_WINDOW_DAYS);
  const [rows, days, presets, targets] = await Promise.all([
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
    ctx.db
      .query("presets")
      .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId))
      .collect(),
    listWithProgress(ctx, ownerId, { weekStartJst: mondayOfWeek(todayJst) }),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const counted = countByWeekday(liveRows(rows, liveDayDates), liveDayDates);
  const presetByWeekday = new Map(
    presets.map((preset) => [preset.weekday, { _id: preset._id, name: preset.name }]),
  );
  const weekdays = counted.map((counts) => {
    const preset = presetByWeekday.get(counts.weekday);
    return {
      confirmed: counts.confirmed,
      leftover: counts.leftover,
      planned: plannedCount(counts),
      presetId: preset?._id ?? null,
      presetName: preset?.name ?? null,
      skipped: counts.skipped,
      weekday: counts.weekday,
    };
  });
  return {
    suggestions: suggestWeekdays(counted),
    weekdays,
    weeklyTargets: {
      achieved: targets.filter((target) => target.achieved).length,
      total: targets.length,
    },
    windowEnd,
    windowStart,
  };
}
