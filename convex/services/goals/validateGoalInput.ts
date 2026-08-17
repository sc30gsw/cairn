import { Result } from "better-result";

import { validateConcreteAction } from "../../lib/concreteActionCore";
import {
  GOAL_DATE_MESSAGE,
  MASTERY_CRITERION_MESSAGE,
  PACE_FLOOR_MESSAGE,
  PACE_LIMITS,
  PACE_DAYS_MESSAGE,
  TOEIC_SCORE,
  TOEIC_SCORE_ORDER_MESSAGE,
  TOEIC_SCORE_RANGE_MESSAGE,
  TOEIC_SCORE_STEP_MESSAGE,
  VOLUME_AMOUNT_LIMITS,
  VOLUME_AMOUNT_MESSAGE,
  VOLUME_START_MESSAGE,
  VOLUME_TARGET_MESSAGE,
} from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { isDateJst } from "../../lib/jst";
import type { GoalInput } from "../../lib/validators";

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
  if (deadline !== undefined && !isDateJst(deadline)) {
    return GOAL_DATE_MESSAGE;
  }
  return null;
}

//? タイプごとの値制約。違反した最初の1件だけを日本語メッセージで返す(CVX-09: 純関数)。
function goalInputMessage(input: GoalInput): string | null {
  const contentMessage = validateConcreteAction(input.content);
  if (contentMessage !== null) {
    return contentMessage;
  }
  switch (input.type) {
    case "exam": {
      if (!isDateJst(input.examDate)) {
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
      if (!isDateJst(input.deadline)) {
        return GOAL_DATE_MESSAGE;
      }
      //? NaN は比較演算子を素通りするので、整数判定で先に落とす。
      if (
        !Number.isInteger(input.targetAmount) ||
        input.targetAmount < VOLUME_AMOUNT_LIMITS.minTarget
      ) {
        return VOLUME_TARGET_MESSAGE;
      }
      if (input.startAmount === undefined) {
        return null;
      }
      if (
        !Number.isInteger(input.startAmount) ||
        input.startAmount < VOLUME_AMOUNT_LIMITS.minStart
      ) {
        return VOLUME_AMOUNT_MESSAGE;
      }
      //? 開始量が目標量以上だと「生まれつき達成済み」や負の進捗率になる。
      return input.startAmount >= input.targetAmount ? VOLUME_START_MESSAGE : null;
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

//* 目標入力の検証。想定内の失敗なので型付きエラーを Result で返し、投げるのは mutation の境界に任せる。
export function validateGoalInput(input: GoalInput): Result<null, ValidationFailedError> {
  const message = goalInputMessage(input);
  return message === null ? Result.ok(null) : Result.err(new ValidationFailedError({ message }));
}
