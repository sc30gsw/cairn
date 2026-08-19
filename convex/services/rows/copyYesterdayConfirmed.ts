import type { MutationCtx } from "../../_generated/server";
import { addDaysJst } from "../../lib/jst";
import { getLiveDay } from "../days/getLiveDay";
import { liveRowsForDay } from "../days/liveRowsForDay";
import { requireEditableDay } from "../days/requireEditableDay";
import { requireLiveDay } from "../days/requireLiveDay";

export async function copyYesterdayConfirmed(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
): Promise<number> {
  await requireEditableDay(ctx, ownerId, args.dateJst, args.todayJst);
  const yesterday = addDaysJst(args.dateJst, -1);
  const sourceDay = await getLiveDay(ctx, ownerId, yesterday);
  if (sourceDay === null) {
    return 0;
  }
  const confirmed = (await liveRowsForDay(ctx, sourceDay._id)).filter(
    (row) => row.status === "確定",
  );
  if (confirmed.length === 0) {
    return 0;
  }
  const day = await requireLiveDay(ctx, ownerId, args.dateJst);
  const existing = await liveRowsForDay(ctx, day._id);
  const startOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1);
  await Promise.all(
    confirmed.map((row, index) =>
      ctx.db.insert("rows", {
        content: row.content,
        dateJst: args.dateJst,
        dayId: day._id,
        itemId: row.itemId,
        minutes: row.minutes,
        ownerId,
        sortOrder: startOrder + 1 + index,
        status: "未着手",
      }),
    ),
  );
  return confirmed.length;
}
