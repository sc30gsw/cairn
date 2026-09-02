import { REVIEW_STAGE_COUNT } from "~domain/review";
import type { RowReviewDto } from "~domain/validators";

const REVIEW_LABEL = "復習";
export const REVIEW_MENU_LABEL = "復習";
export const REVIEW_STOP_LABEL = "復習をやめる";

export function reviewBadgeLabel(review: NonNullable<RowReviewDto>): string {
  if (review.kind === "review") {
    return `${REVIEW_LABEL} ${String(review.stage + 1)}/${String(REVIEW_STAGE_COUNT)}`;
  }
  return `${REVIEW_LABEL} ${review.dueJst}`;
}

export function reviewBadgeTooltip(review: NonNullable<RowReviewDto>): string {
  if (review.kind === "review") {
    return `${String(review.stage + 1)}回目の復習。確定すると次の期日が決まり、見送ると復習は終わります`;
  }
  return `${review.dueJst} に復習として並びます（${String(review.stage + 1)}回目）`;
}

export function reviewIntervalLabel(days: number): string {
  return `${String(days)}日後に復習`;
}
