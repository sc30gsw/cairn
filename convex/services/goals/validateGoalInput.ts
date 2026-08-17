import { validateConcreteAction } from "../../lib/concreteActionCore";
import { DATE_JST_PATTERN, PACE_LIMITS, TOEIC_SCORE } from "../../lib/domain";
import type { GoalInput } from "../../lib/validators";

export const GOAL_DATE_MESSAGE = "日付は YYYY-MM-DD で入力してください";

export const TOEIC_SCORE_RANGE_MESSAGE = `スコアは${TOEIC_SCORE.min}〜${TOEIC_SCORE.max}で入力してください`;

export const TOEIC_SCORE_STEP_MESSAGE = `スコアは${TOEIC_SCORE.step}点刻みで入力してください`;

export const TOEIC_SCORE_ORDER_MESSAGE = "目標点の下限が上限を超えています";

export const PACE_DAYS_MESSAGE = `週の実施日数は${PACE_LIMITS.minDays}〜${PACE_LIMITS.maxDays}日で入力してください`;

export const PACE_FLOOR_MESSAGE = `1日あたりの最低分数は${PACE_LIMITS.minFloorMinutes}分以上です`;

export const VOLUME_TARGET_MESSAGE = "目標量は1以上で入力してください";

export const VOLUME_AMOUNT_MESSAGE = "現在量は0以上です";

export const MASTERY_CRITERION_MESSAGE = "達成の基準を入力してください";

function scoreMessage(score: number): string | null {
  if (!Number.isInteger(score) || score < TOEIC_SCORE.min || score > TOEIC_SCORE.max) {
    return TOEIC_SCORE_RANGE_MESSAGE;
  }
  if (score % TOEIC_SCORE.step !== 0) {
    return TOEIC_SCORE_STEP_MESSAGE;
  }
  return null;
}

function optionalDateMessage(deadline: string | undefined): string | null {
  if (deadline !== undefined && !DATE_JST_PATTERN.test(deadline)) {
    return GOAL_DATE_MESSAGE;
  }
  return null;
}

//* タイプごとの値制約。副作用なしの純関数(CVX-09)。違反なら日本語メッセージ、問題なければ null。
export function validateGoalInput(input: GoalInput): string | null {
  const contentMessage = validateConcreteAction(input.content);
  if (contentMessage !== null) {
    return contentMessage;
  }
  switch (input.type) {
    case "exam": {
      if (!DATE_JST_PATTERN.test(input.examDate)) {
        return GOAL_DATE_MESSAGE;
      }
      const minMessage = scoreMessage(input.minScore);
      if (minMessage !== null) {
        return minMessage;
      }
      const maxMessage = scoreMessage(input.maxScore);
      if (maxMessage !== null) {
        return maxMessage;
      }
      return input.minScore > input.maxScore ? TOEIC_SCORE_ORDER_MESSAGE : null;
    }
    case "pace": {
      if (
        !Number.isInteger(input.daysPerWeek) ||
        input.daysPerWeek < PACE_LIMITS.minDays ||
        input.daysPerWeek > PACE_LIMITS.maxDays
      ) {
        return PACE_DAYS_MESSAGE;
      }
      if (
        !Number.isInteger(input.dailyFloorMinutes) ||
        input.dailyFloorMinutes < PACE_LIMITS.minFloorMinutes
      ) {
        return PACE_FLOOR_MESSAGE;
      }
      return null;
    }
    case "volume": {
      if (!DATE_JST_PATTERN.test(input.deadline)) {
        return GOAL_DATE_MESSAGE;
      }
      if (input.targetAmount <= 0) {
        return VOLUME_TARGET_MESSAGE;
      }
      if (input.startAmount !== undefined && input.startAmount < 0) {
        return VOLUME_AMOUNT_MESSAGE;
      }
      return null;
    }
    case "mastery": {
      if (input.criterion.trim().length === 0) {
        return MASTERY_CRITERION_MESSAGE;
      }
      return optionalDateMessage(input.deadline);
    }
    default:
      return optionalDateMessage(input.deadline);
  }
}
