import { completedCount, confirmedRatio, type CompletionCounts } from "./completionRate";
import type { Condition } from "./conditions";
import { dayViewKind, type DayViewKind } from "./dayView";
import { STATUSES } from "./domain";
import type { WeeklyDigest, WeeklyReviewDay } from "./validators";

const [confirmedStatus, leftoverStatus, ongoingStatus, skippedStatus] = STATUSES;

export type WeeklyStatusRow = {
  dateJst: string;
  minutes: number;
  status: (typeof STATUSES)[number];
};

function emptyCounts(): CompletionCounts {
  return { confirmed: 0, leftover: 0, ongoing: 0, skipped: 0 };
}

function addRow(counts: CompletionCounts, status: WeeklyStatusRow["status"]): CompletionCounts {
  if (status === confirmedStatus) {
    return { ...counts, confirmed: counts.confirmed + 1 };
  }
  if (status === leftoverStatus) {
    return { ...counts, leftover: counts.leftover + 1 };
  }
  if (status === ongoingStatus) {
    return { ...counts, ongoing: counts.ongoing + 1 };
  }
  if (status === skippedStatus) {
    return { ...counts, skipped: counts.skipped + 1 };
  }
  return counts;
}

function countRows(rows: readonly WeeklyStatusRow[]): CompletionCounts {
  return rows.reduce((counts, row) => addRow(counts, row.status), emptyCounts());
}

//* 消化に数える暦日: 週内で「今日より前」の日だけ。
//? 今日の未着手を計画倒れに数えない(CONTEXT「消化」_Avoid_)。未来の日はそもそも記録が無い。
//? 既存 presetReview(今日を除く直近28日)と月次レビューの週バケットと同じ規則にそろえる。
export function digestCountedDates(
  weekDates: readonly string[],
  todayJst: string,
): readonly string[] {
  return weekDates.filter((dateJst) => dateJst < todayJst);
}

export function buildWeeklyDigest(
  weekDates: readonly string[],
  rows: readonly WeeklyStatusRow[],
  todayJst: string,
): WeeklyDigest {
  const counted = digestCountedDates(weekDates, todayJst);
  const countedSet = new Set(counted);
  const counts = countRows(rows.filter((row) => countedSet.has(row.dateJst)));
  return {
    confirmedCount: counts.confirmed,
    countedFrom: counted[0] ?? weekDates[0] ?? todayJst,
    countedThrough: counted.at(-1) ?? null,
    digestRate: confirmedRatio(counts),
    isPartial: counted.length < weekDates.length,
    leftoverCount: counts.leftover,
    ongoingCount: counts.ongoing,
    plannedCount: completedCount(counts),
    skippedCount: counts.skipped,
  };
}

//* 週の7日分。学習量・コンディション・消化を1日1行にまとめる。
export function buildWeeklyReviewDays(args: {
  conditionByDate: Readonly<Record<string, Condition | null | undefined>>;
  liveDayDates: ReadonlySet<string>;
  rows: readonly WeeklyStatusRow[];
  todayJst: string;
  weekDates: readonly string[];
}): WeeklyReviewDay[] {
  const rowsByDate = new Map<string, WeeklyStatusRow[]>();
  for (const row of args.rows) {
    const list = rowsByDate.get(row.dateJst);
    if (list === undefined) {
      rowsByDate.set(row.dateJst, [row]);
    } else {
      list.push(row);
    }
  }
  const countedSet = new Set(digestCountedDates(args.weekDates, args.todayJst));

  return args.weekDates.map((dateJst) => {
    const dayRows = rowsByDate.get(dateJst) ?? [];
    const counts = countRows(dayRows);
    const kind: DayViewKind = dayViewKind({
      dateJst,
      hasLiveDay: args.liveDayDates.has(dateJst),
      todayJst: args.todayJst,
    });
    const planned = completedCount(counts);
    return {
      condition: args.conditionByDate[dateJst] ?? null,
      confirmedCount: counts.confirmed,
      confirmedMinutes: dayRows.reduce(
        (total, row) => (row.status === confirmedStatus ? total + row.minutes : total),
        0,
      ),
      dateJst,
      //? 数えない日(今日・未来)と、並んだ件数0 の日は null。
      digestRate: countedSet.has(dateJst) && planned > 0 ? confirmedRatio(counts) : null,
      kind,
      plannedCount: planned,
      skippedCount: counts.skipped,
    };
  });
}

//* 週内で今日以前の暦日数。1日平均の分母(過去週は常に7)。
export function elapsedDaysInWeek(weekDates: readonly string[], todayJst: string): number {
  return weekDates.filter((dateJst) => dateJst <= todayJst).length;
}
