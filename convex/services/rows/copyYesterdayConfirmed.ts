import type { MutationCtx } from "../../_generated/server";
import { STATUSES } from "../../lib/domain";
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
  const yesterday = addDaysJst(args.dateJst, -1);
  const [existing, sourceDay] = await Promise.all([
    requireEditableDay(ctx, ownerId, args.dateJst, args.todayJst),
    getLiveDay(ctx, ownerId, yesterday),
  ]);
  if (sourceDay === null) {
    return 0;
  }
  const [confirmedStatus, pendingStatus] = STATUSES;
  const confirmed = (await liveRowsForDay(ctx, sourceDay._id)).filter(
    (row) => row.status === confirmedStatus,
  );
  if (confirmed.length === 0) {
    return 0;
  }
  const day = existing ?? (await requireLiveDay(ctx, ownerId, args.dateJst));
  const liveRows = await liveRowsForDay(ctx, day._id);
  const startOrder = liveRows.reduce((max, row) => Math.max(max, row.sortOrder), -1);
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
        status: pendingStatus,
      }),
    ),
  );
  return confirmed.length;
}
