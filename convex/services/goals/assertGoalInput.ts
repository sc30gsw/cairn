import { Result } from "better-result";

import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { validateGoalInput } from "./validateGoalInput";

export function assertGoalInput(goal: GoalInput): null {
  const validated = validateGoalInput(goal);
  if (Result.isError(validated)) {
    throwDomain(validated.error);
  }
  return null;
}
