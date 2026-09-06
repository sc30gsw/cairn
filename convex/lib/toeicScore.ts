import { TOEIC_SCORE, TOEIC_SCORE_RANGE_MESSAGE, TOEIC_SCORE_STEP_MESSAGE } from "./domain";

export function toeicScoreMessage(score: number): string | null {
  if (!Number.isInteger(score) || score < TOEIC_SCORE.min || score > TOEIC_SCORE.max) {
    return TOEIC_SCORE_RANGE_MESSAGE;
  }
  if (score % TOEIC_SCORE.step !== 0) {
    return TOEIC_SCORE_STEP_MESSAGE;
  }
  return null;
}
