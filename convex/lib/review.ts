import { addDaysJst } from "./jst";

//? 復習は Leitner 型の固定間隔。段階が進むほど間隔が開き、最後の段階を終えたら印は消える
//? （docs/research/review-flag-precedents.md: 拡張間隔の精密さより「間隔を空けること」自体が効く）
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14] as const satisfies readonly number[];

export const REVIEW_STAGE_COUNT = REVIEW_INTERVAL_DAYS.length;

export const REVIEW_ONLY_CONFIRMED_MESSAGE = "復習に回せるのは確定した記録だけです";

export const REVIEW_OF_REVIEW_MESSAGE = "復習の記録はそのまま確定すれば次の復習に進みます";

export const REVIEW_DUE_MESSAGE = "復習の期日は明日以降にしてください";

export function reviewIntervalDays(stage: number): number {
  const index = Math.min(Math.max(stage, 0), REVIEW_STAGE_COUNT - 1);
  return REVIEW_INTERVAL_DAYS[index] ?? REVIEW_INTERVAL_DAYS[0];
}

//? 段階 stage の復習期日。基準日（印を付けた日 / 復習を確定した日）から段階ぶんの日数後
export function reviewDueJst(baseDateJst: string, stage: number): string {
  return addDaysJst(baseDateJst, reviewIntervalDays(stage));
}

//? 次の段階。最後の段階を終えたら null（印は消える）
export function nextReviewStage(stage: number): number | null {
  return stage + 1 < REVIEW_STAGE_COUNT ? stage + 1 : null;
}

export function isReviewDue(dueJst: string, todayJst: string): boolean {
  return dueJst <= todayJst;
}
