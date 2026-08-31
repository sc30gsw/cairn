import type { Doc } from "../../_generated/dataModel";
import { GOAL_SCOPE_FROZEN_MESSAGE } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { sameScopeItemIds } from "./scopeItemIds";

export function assertScopeUnfrozen(existing: Doc<"goals">, next: GoalInput): null {
  if (existing.type !== "mastery" || next.type !== "mastery" || existing.achievedAt === undefined) {
    return null;
  }
  if (!sameScopeItemIds(existing.scopeItemIds, next.scopeItemIds)) {
    throwDomain(new ValidationFailedError({ message: GOAL_SCOPE_FROZEN_MESSAGE }));
  }
  return null;
}
