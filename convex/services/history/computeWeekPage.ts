import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { buildWeekBreakdown } from "../../lib/historyBreakdown";
import { addDaysJst, mondayOfWeek } from "../../lib/jst";
import { confirmedVolumeMinutes } from "../../lib/volume";
import { buildConditionByDate, buildHeatmapDays, buildMinutesByDate } from "./heatmapDays";
import { liveDayDatesFrom, liveRows } from "./liveRows";
import { rowsToHistoryEvents } from "./rowToHistoryEvent";

export async function computeWeekPage(
  ctx: QueryCtx,
  ownerId: string,
  args: { dateJst: string; todayJst: string },
) {
  const weekStart = mondayOfWeek(args.dateJst);
  const weekEnd = addDaysJst(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, offset) => addDaysJst(weekStart, offset));
  const lookbackStart = addDaysJst(weekStart, -6);
  const [rows, days, catalog] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", weekEnd),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", weekEnd),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const liveWeekRows = liveRows(
    rows.filter((row) => row.dateJst >= weekStart && row.dateJst <= weekEnd),
    liveDayDates,
  );
  const events = rowsToHistoryEvents(liveWeekRows, catalog);
  const minutesByDate = buildMinutesByDate(rows, liveDayDates);
  const conditionByDate = buildConditionByDate(days);
  return {
    days: buildHeatmapDays(weekDates, args.todayJst, liveDayDates, minutesByDate, conditionByDate),
    events,
    volumeMinutes: confirmedVolumeMinutes(liveWeekRows),
    weekBreakdown: buildWeekBreakdown(
      weekStart,
      weekEnd,
      weekDates,
      args.todayJst,
      liveWeekRows,
      liveDayDates,
      catalog.itemById,
      catalog.categoryById,
      conditionByDate,
    ),
    weekEnd,
    weekStart,
  };
}
