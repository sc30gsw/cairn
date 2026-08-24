import type { MutationCtx } from "../../_generated/server";
import { STATUSES } from "../../lib/domain";
import { weekdayFromDateJst } from "../../lib/jst";
import type { NotificationPayload } from "../../lib/validators";
import { getLiveDay } from "../days/getLiveDay";
import { liveRowsForDay } from "../days/liveRowsForDay";

const [, pendingStatus] = STATUSES;

//* 夜の未着手。進行中は催促しない(手を動かしている人を急かさない)。
//? 日が無ければ今日の曜日のプリセット行数を数える。プリセットも無ければ黙る
//? (計画が無い日に催促するのは「休養を計画倒れに数える」こと)。
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
  const preset = await ctx.db
    .query("presets")
    .withIndex("by_owner_and_weekday", (q) =>
      q.eq("ownerId", ownerId).eq("weekday", weekdayFromDateJst(dateJst)),
    )
    .unique();
  if (preset === null || preset.lines.length === 0) {
    return null;
  }
  return { dateJst, kind: "eveningUntouched", pendingCount: preset.lines.length, source: "preset" };
}
