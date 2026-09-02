import type { MutationCtx } from "../../_generated/server";
import { presetWeekdayFor } from "../../lib/holidayPreset";
import { getSettings as getPresetSettings } from "../presets/getSettings";
import { loadOwnerReviewFlags } from "../reviews/loadOwnerReviewFlags";
import { dueUnplacedFlags, placeDueReviews } from "../reviews/placeDueReviews";
import { collapseExtraLiveDays } from "./collapseExtraLiveDays";
import { getDayByDate } from "./getDayByDate";
import { liveRowsForDay } from "./liveRowsForDay";

//? 今日を開いたとき: 曜日（祝日設定込み）のプリセットを未着手で並べ、期日の来た復習を先頭に足す。
//? どちらも同じトランザクション。applied はプリセットを適用したかだけを表す（従来どおり）
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
  const [preset, flags] = await Promise.all([
    ctx.db
      .query("presets")
      .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ownerId).eq("weekday", weekday))
      .unique(),
    loadOwnerReviewFlags(ctx, ownerId),
  ]);
  const presetLines = preset === null ? [] : preset.lines;
  const dueFlags = dueUnplacedFlags(flags, args.dateJst);
  if (presetLines.length === 0 && dueFlags.length === 0) {
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
  const applied = presetLines.length > 0 && liveRows.length === 0;
  if (applied) {
    await Promise.all(
      presetLines.map((line, index) =>
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
  }
  await placeDueReviews(ctx, ownerId, { dateJst: args.dateJst, day, flags: dueFlags, liveRows });
  return { applied };
}
