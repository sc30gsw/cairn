import type { QueryCtx } from "../../_generated/server";
import { getLiveDay } from "./getLiveDay";
import { liveRowsForDay } from "./liveRowsForDay";
import { isFutureDateJst } from "../../lib/jst";
import { formatShareMarkdown } from "../../lib/share";
import type { DayPageDto } from "../../lib/validators";
import { confirmedVolumeMinutes } from "../../lib/volume";
import { toRowDtos } from "./toRowDtos";

export async function getDayPage(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
): Promise<DayPageDto> {
  const day = await getLiveDay(ctx, ownerId, args.dateJst);
  const rows = day === null ? [] : await liveRowsForDay(ctx, day._id);
  const rowDtos = await toRowDtos(ctx, ownerId, rows);
  return {
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
    isFuture: isFutureDateJst(args.dateJst, args.todayJst),
    rows: rowDtos,
    shareMarkdown: formatShareMarkdown(rowDtos),
    volumeMinutes: confirmedVolumeMinutes(rowDtos),
  };
}
