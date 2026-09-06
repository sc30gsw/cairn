import type { QueryCtx } from "../../_generated/server";
import { addDaysJst } from "../../lib/jst";
import { serviceStartDate } from "../days/serviceStartDate";
import {
  buildConditionByDate,
  buildHeatmapDays,
  buildMemoByDate,
  buildMinutesByDate,
  calendarDatesFromTo,
  YEAR_HEATMAP_DAYS,
} from "./heatmapDays";
import { liveDayDatesFrom } from "./liveRows";

export async function computeYearHeatmap(ctx: QueryCtx, ownerId: string, todayJst: string) {
  const end = todayJst;
  const start = addDaysJst(end, -(YEAR_HEATMAP_DAYS - 1));
  const lookbackStart = addDaysJst(start, -6);
  const [serviceStartDateJst, rows, days] = await Promise.all([
    serviceStartDate(ctx, ownerId),
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", lookbackStart).lte("dateJst", end),
      )
      .collect(),
  ]);
  const liveDayDates = liveDayDatesFrom(days);
  const minutesByDate = buildMinutesByDate(rows, liveDayDates);
  const conditionByDate = buildConditionByDate(days);
  const memoByDate = buildMemoByDate(days);
  return {
    days: buildHeatmapDays(
      calendarDatesFromTo(start, end),
      todayJst,
      liveDayDates,
      minutesByDate,
      conditionByDate,
      memoByDate,
      serviceStartDateJst,
    ),
    endDate: end,
    startDate: start,
  };
}
