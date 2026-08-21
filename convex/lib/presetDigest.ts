import { STATUSES, type Status } from "./domain";
import { weekdayFromDateJst } from "./jst";

//? 今日を除く過去28暦日。今日の未着手は計画倒れではない。
export const PRESET_REVIEW_WINDOW_DAYS = 28;

//? 件数が少なすぎる曜日は、消化の差がノイズになる。
export const PRESET_REVIEW_MIN_PLANNED = 3;

//? 消化が半分未満なら、他曜日との差がなくても提案する。
export const PRESET_REVIEW_DIGEST_FLOOR = 0.5;

//? 他曜日の平均よりこの幅以上低いときだけ「低い」とみなす。
export const PRESET_REVIEW_DIGEST_GAP = 0.15;

export const PRESET_REVIEW_MAX_SUGGESTIONS = 2;

export const PRESET_REVIEW_REASONS = [
  "leftoverHeavy",
  "skipHeavy",
] as const satisfies readonly string[];

export type PresetReviewReason = (typeof PRESET_REVIEW_REASONS)[number];

const [confirmedStatus, leftoverStatus, skippedStatus] = STATUSES;

export type WeekdayCounts = {
  confirmed: number;
  leftover: number;
  skipped: number;
  weekday: number;
};

export type PresetReviewSuggestion = {
  reason: PresetReviewReason;
  weekday: number;
};

export type StatusedRow = {
  dateJst: string;
  status: Status;
};

export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function emptyCounts(weekday: number): WeekdayCounts {
  return { confirmed: 0, leftover: 0, skipped: 0, weekday };
}

export function plannedCount(counts: WeekdayCounts): number {
  return counts.confirmed + counts.leftover + counts.skipped;
}

export function digestRate(counts: WeekdayCounts): number {
  const planned = plannedCount(counts);
  if (planned === 0) {
    return 0;
  }
  return counts.confirmed / planned;
}

export function countByWeekday(rows: readonly StatusedRow[]): WeekdayCounts[] {
  const byWeekday = new Map<number, WeekdayCounts>(
    WEEKDAY_DISPLAY_ORDER.map((weekday) => [weekday, emptyCounts(weekday)]),
  );
  for (const row of rows) {
    const weekday = weekdayFromDateJst(row.dateJst);
    const current = byWeekday.get(weekday);
    if (current === undefined) {
      continue;
    }
    if (row.status === confirmedStatus) {
      byWeekday.set(weekday, { ...current, confirmed: current.confirmed + 1 });
      continue;
    }
    if (row.status === leftoverStatus) {
      byWeekday.set(weekday, { ...current, leftover: current.leftover + 1 });
      continue;
    }
    if (row.status === skippedStatus) {
      byWeekday.set(weekday, { ...current, skipped: current.skipped + 1 });
    }
  }
  return WEEKDAY_DISPLAY_ORDER.map((weekday) => byWeekday.get(weekday) ?? emptyCounts(weekday));
}

export function suggestionReason(counts: WeekdayCounts): PresetReviewReason {
  return counts.leftover > counts.skipped ? "leftoverHeavy" : "skipHeavy";
}

export function suggestWeekdays(weekdays: readonly WeekdayCounts[]): PresetReviewSuggestion[] {
  const peers = weekdays.filter((counts) => plannedCount(counts) >= PRESET_REVIEW_MIN_PLANNED);
  if (peers.length === 0) {
    return [];
  }
  const mean = peers.reduce((sum, counts) => sum + digestRate(counts), 0) / peers.length;
  return peers
    .filter((counts) => {
      const rate = digestRate(counts);
      const hasLeftoverOrSkip = counts.leftover + counts.skipped > 0;
      const weak = rate < PRESET_REVIEW_DIGEST_FLOOR || rate <= mean - PRESET_REVIEW_DIGEST_GAP;
      return hasLeftoverOrSkip && weak;
    })
    .toSorted((left, right) => digestRate(left) - digestRate(right))
    .slice(0, PRESET_REVIEW_MAX_SUGGESTIONS)
    .map((counts) => ({ reason: suggestionReason(counts), weekday: counts.weekday }));
}
