import { Result } from "better-result";

import { validateConcreteAction } from "../../lib/concreteActionCore";
import {
  GOAL_DATE_MESSAGE,
  MASTERY_CRITERION_MESSAGE,
  TOEIC_SCORE_ORDER_MESSAGE,
} from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { isDateJst } from "../../lib/jst";
import { toeicScoreMessage } from "../../lib/toeicScore";
import type { GoalInput } from "../../lib/validators";

function goalInputMessage(input: GoalInput): string | null {
  const contentMessage = validateConcreteAction(input.content);
  if (contentMessage !== null) {
    return contentMessage;
  }
  if (input.type === "exam") {
    if (!isDateJst(input.examDate)) {
      return GOAL_DATE_MESSAGE;
    }
    const minMessage = toeicScoreMessage(input.minScore);
    if (minMessage !== null) {
      return minMessage;
    }
    const maxMessage = toeicScoreMessage(input.maxScore);
    if (maxMessage !== null) {
      return maxMessage;
    }
    return input.minScore > input.maxScore ? TOEIC_SCORE_ORDER_MESSAGE : null;
  }
  if (input.criterion.trim().length === 0) {
    return MASTERY_CRITERION_MESSAGE;
  }
  if (input.deadline !== undefined && !isDateJst(input.deadline)) {
    return GOAL_DATE_MESSAGE;
  }
  return null;
}

export function validateGoalInput(input: GoalInput): Result<null, ValidationFailedError> {
  const message = goalInputMessage(input);
  return message === null ? Result.ok(null) : Result.err(new ValidationFailedError({ message }));
}
