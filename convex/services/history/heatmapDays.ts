import { groupBy, mapValues, prop } from "remeda";

import type { Doc } from "../../_generated/dataModel";
import type { Condition } from "../../lib/conditions";
import { isRestCalendarDate } from "../../lib/dayView";
import { addDaysJst } from "../../lib/jst";
import { sevenDayMovingAverage } from "../../lib/movingAverage";
import { confirmedVolumeMinutes } from "../../lib/volume";
import { liveRows } from "./liveRows";

export const YEAR_HEATMAP_DAYS = 365;

export function calendarDatesFromTo(startDateJst: string, endDateJst: string): string[] {
  const dates: string[] = [];
  let dateJst = startDateJst;
  while (dateJst <= endDateJst) {
    dates.push(dateJst);
    dateJst = addDaysJst(dateJst, 1);
  }
  return dates;
}

export function buildMinutesByDate(
  rows: Doc<"rows">[],
  liveDayDates: ReadonlySet<string>,
): Record<string, number> {
  return mapValues(groupBy(liveRows(rows, liveDayDates), prop("dateJst")), confirmedVolumeMinutes);
}

export function buildConditionByDate(days: Doc<"days">[]): Record<string, Condition | null> {
  const map: Record<string, Condition | null> = {};
  const liveByDate = groupBy(
    days.filter((day) => day.deletedAt === undefined),
    prop("dateJst"),
  );

  for (const [dateJst, liveDays] of Object.entries(liveByDate)) {
    const canonical = liveDays.toSorted(
      (left, right) => left._creationTime - right._creationTime,
    )[0];
    if (canonical !== undefined) {
      map[dateJst] = canonical.condition ?? null;
    }
  }

  return map;
}

export function buildMemoByDate(days: Doc<"days">[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  const liveByDate = groupBy(
    days.filter((day) => day.deletedAt === undefined),
    prop("dateJst"),
  );

  for (const [dateJst, liveDays] of Object.entries(liveByDate)) {
    const canonical = liveDays.toSorted(
      (left, right) => left._creationTime - right._creationTime,
    )[0];
    if (canonical !== undefined) {
      const memo = canonical.memo?.trim();
      map[dateJst] = memo === undefined || memo.length === 0 ? null : memo;
    }
  }

  return map;
}

export function buildHeatmapDays(
  dates: readonly string[],
  todayJst: string,
  liveDayDates: ReadonlySet<string>,
  minutesByDate: Readonly<Record<string, number>>,
  conditionByDate: Readonly<Record<string, Condition | null>>,
  memoByDate: Readonly<Record<string, string | null>> = {},
) {
  return dates.map((dateJst) => ({
    condition: conditionByDate[dateJst] ?? null,
    dateJst,
    isRest: isRestCalendarDate(dateJst, todayJst, liveDayDates.has(dateJst)),
    memo: memoByDate[dateJst] ?? null,
    minutes: minutesByDate[dateJst] ?? 0,
    movingAverage: sevenDayMovingAverage(minutesByDate, dateJst),
  }));
}
