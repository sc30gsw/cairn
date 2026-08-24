import { completedCount, confirmedRatio, type CompletionCounts } from "./completionRate";
import { STATUSES } from "./domain";
import { weekdayFromDateJst } from "./jst";
import type { MonthlyDigestBucket } from "./validators";

const [confirmedStatus, leftoverStatus, ongoingStatus, skippedStatus] = STATUSES;

export type DateStatusRow = { dateJst: string; status: (typeof STATUSES)[number] };

type DateBucket = { dates: string[]; end: string; start: string };

//* 月の暦日リストを月曜始まりの週でバケット化する。月境界をまたぐ週は月内の日数だけの部分週になる
//? (例: 2026-08 は 8/1(土)〜8/2(日) の部分週で始まり、8/31(月) 単独の部分週で終わる)。
//? 前月・翌月の日を混ぜないので、月内の消化推移と月間合計の整合が常に取れる。
export function bucketDatesByWeek(dates: readonly string[]): DateBucket[] {
  //? 引数は読み取り専用のまま、戻り値だけをこの関数内で組み立てる(入力を破壊しない)
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

//* 週バケットごとの消化推移。当日以降の行は数えない
//? (CONTEXT「消化」: 今日の未着手を計画倒れに数えない。weeklyReview.ts の digestCountedDates と同じ規則)。
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
      //? 月境界の部分週(7日未満) or 当日以降を含む進行中の週は「週全体を代表しない」印をつける。
      isPartial: countedDates.length < bucket.dates.length || bucket.dates.length < WEEK_LENGTH,
      plannedCount: completedCount(counts),
    };
  });
}
