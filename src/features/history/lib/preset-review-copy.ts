import { WEEKDAY_NAMES, type Weekday } from "~domain/catalog";
import { PRESET_REVIEW_WINDOW_DAYS } from "~domain/presetDigest";

import type { PresetReview } from "~/features/history/types/history";

type Suggestion = PresetReview["suggestions"][number];
type WeekdayRow = PresetReview["weekdays"][number];

export function weekdayLabel(weekday: Weekday) {
  return WEEKDAY_NAMES[weekday];
}

export function presetReviewCaption(windowStart: string, windowEnd: string) {
  return `${windowStart} 〜 ${windowEnd}（今日と休養は含めない。直近${PRESET_REVIEW_WINDOW_DAYS}日）`;
}

export function suggestionCopy(suggestion: Suggestion, weekday: WeekdayRow) {
  const label = weekdayLabel(suggestion.weekday);
  const counts = `並んだ${weekday.planned}件のうち確定${weekday.confirmed}・見送り${weekday.skipped}・未着手${weekday.leftover}`;
  if (suggestion.reason === "leftoverHeavy") {
    return `直近の${label}は、${counts}。未着手のまま残ることが多い。`;
  }
  return `直近の${label}は、${counts}。見送りが多い。`;
}

export function suggestionLinkLabel(weekday: Weekday) {
  return `${weekdayLabel(weekday)}のプリセットを見る`;
}
