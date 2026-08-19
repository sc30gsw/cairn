import type { QueryCtx } from "../../_generated/server";
import { dayViewKind } from "../../lib/dayView";
import { addDaysJst, isFutureDateJst } from "../../lib/jst";
import { formatShareMarkdown } from "../../lib/share";
import type { DayPageDto } from "../../lib/validators";
import { confirmedVolumeMinutes } from "../../lib/volume";
import { getLiveDay } from "./getLiveDay";
import { liveRowsForDay } from "./liveRowsForDay";
import { toRowDtos } from "./toRowDtos";

export async function getDayPage(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
): Promise<DayPageDto> {
  const unrecorded = isFutureDateJst(args.dateJst, args.todayJst);
  const yesterday = addDaysJst(args.dateJst, -1);
  const [day, sourceDay] = await Promise.all([
    getLiveDay(ctx, ownerId, args.dateJst),
    unrecorded ? Promise.resolve(null) : getLiveDay(ctx, ownerId, yesterday),
  ]);
  const [rows, sourceRows] = await Promise.all([
    day === null ? Promise.resolve([]) : liveRowsForDay(ctx, day._id),
    sourceDay === null ? Promise.resolve([]) : liveRowsForDay(ctx, sourceDay._id),
  ]);
  const rowDtos = await toRowDtos(ctx, ownerId, rows);
  return {
    canCopyYesterday: sourceRows.some((row) => row.status === "確定"),
    dateJst: args.dateJst,
    day:
      day === null
        ? null
        : {
            _id: day._id,
            condition: day.condition ?? null,
            dateJst: day.dateJst,
            memo: day.memo ?? null,
          },
    kind: dayViewKind({
      dateJst: args.dateJst,
      hasLiveDay: day !== null,
      todayJst: args.todayJst,
    }),
    rows: rowDtos,
    shareMarkdown: formatShareMarkdown(rowDtos),
    volumeMinutes: confirmedVolumeMinutes(rowDtos),
  };
}
