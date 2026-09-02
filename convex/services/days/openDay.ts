import type { MutationCtx } from "../../_generated/server";
import { presetWeekdayFor } from "../../lib/holidayPreset";
import { getSettings as getPresetSettings } from "../presets/getSettings";
import { collapseExtraLiveDays } from "./collapseExtraLiveDays";
import { getDayByDate } from "./getDayByDate";
import { liveRowsForDay } from "./liveRowsForDay";

export async function openDay(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
): Promise<{ applied: boolean }> {
  if (args.dateJst !== args.todayJst) {
    return { applied: false };
  }
  const existing = await getDayByDate(ctx, ownerId, args.dateJst);
  if (existing !== null && existing.deletedAt !== undefined) {
    return { applied: false };
  }
  const weekday = presetWeekdayFor(args.dateJst, await getPresetSettings(ctx, ownerId));
  const preset = await ctx.db
    .query("presets")
    .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId).eq("weekday", weekday))
    .unique();
  if (preset === null || preset.lines.length === 0) {
    return { applied: false };
  }
  let day = existing;
  if (day === null) {
    await ctx.db.insert("days", { dateJst: args.dateJst, ownerId });
    day = await collapseExtraLiveDays(ctx, ownerId, args.dateJst);
    if (day === null) {
      return { applied: false };
    }
  }
  const liveRows = await liveRowsForDay(ctx, day._id);
  if (liveRows.length > 0) {
    return { applied: false };
  }
  await Promise.all(
    preset.lines.map((line, index) =>
      ctx.db.insert("rows", {
        content: line.content,
        dateJst: args.dateJst,
        dayId: day._id,
        itemId: line.itemId,
        minutes: line.minutes,
        ownerId,
        sortOrder: index,
        status: "未着手",
      }),
    ),
  );
  return { applied: true };
}
