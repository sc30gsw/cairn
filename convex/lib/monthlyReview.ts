import { completedCount, confirmedRatio, type CompletionCounts } from "./completionRate";
import { STATUSES } from "./domain";
import { weekdayFromDateJst } from "./jst";
import type { MonthlyDigestBucket } from "./validators";

const [confirmedStatus, leftoverStatus, ongoingStatus, skippedStatus] = STATUSES;

export type DateStatusRow = { dateJst: string; status: (typeof STATUSES)[number] };

type DateBucket = { dates: string[]; end: string; start: string };

export function bucketDatesByWeek(dates: readonly string[]): DateBucket[] {
  const buckets: DateBucket[] = [];
  for (const dateJst of dates) {
    const current = buckets.at(-1);
    if (current === undefined || weekdayFromDateJst(dateJst) === 1) {
      buckets.push({ dates: [dateJst], end: dateJst, start: dateJst });
      continue;
    }
    current.dates.push(dateJst);
    current.end = dateJst;
  }
  return buckets;
}

function countStatuses(rows: readonly DateStatusRow[]): CompletionCounts {
  return rows.reduce<CompletionCounts>(
    (counts, row) => {
      if (row.status === confirmedStatus) {
        return { ...counts, confirmed: counts.confirmed + 1 };
      }
      if (row.status === leftoverStatus) {
        return { ...counts, leftover: counts.leftover + 1 };
      }
      if (row.status === ongoingStatus) {
        return { ...counts, ongoing: counts.ongoing + 1 };
      }
      if (row.status === skippedStatus) {
        return { ...counts, skipped: counts.skipped + 1 };
      }
      return counts;
    },
    { confirmed: 0, leftover: 0, ongoing: 0, skipped: 0 },
  );
}

const WEEK_LENGTH = 7;

export function buildMonthlyDigestTrend(
  dates: readonly string[],
  rows: readonly DateStatusRow[],
  todayJst: string,
): MonthlyDigestBucket[] {
  const rowsByDate = new Map<string, DateStatusRow[]>();
  for (const row of rows) {
    const list = rowsByDate.get(row.dateJst);
    if (list === undefined) {
      rowsByDate.set(row.dateJst, [row]);
    } else {
      list.push(row);
    }
  }

  return bucketDatesByWeek(dates).map((bucket) => {
    const countedDates = bucket.dates.filter((dateJst) => dateJst < todayJst);
    const counts = countStatuses(countedDates.flatMap((dateJst) => rowsByDate.get(dateJst) ?? []));
    return {
      bucketEnd: bucket.end,
      bucketStart: bucket.start,
      confirmedCount: counts.confirmed,
      digestRate: confirmedRatio(counts),
      isPartial: countedDates.length < bucket.dates.length || bucket.dates.length < WEEK_LENGTH,
      plannedCount: completedCount(counts),
    };
  });
}
