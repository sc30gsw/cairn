import type { Doc } from "../../_generated/dataModel";
import { GOAL_SCOPE_FROZEN_MESSAGE } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { sameScopeItemIds } from "./scopeItemIds";

//* 達成済みの目標では対象項目を凍結する(CVX-09: 純関数)。
//? 実績は達成時点で凍結されている(ADR-0007)ので、対象を変えると凍結値の意味が壊れる。
//? 変えたいなら達成を外す — 既存の解除→再計算がそのまま正しい経路になる(#53 §7.2)。
export function assertScopeUnfrozen(existing: Doc<"goals">, next: GoalInput): null {
  if (existing.type !== "mastery" || next.type !== "mastery" || existing.achievedAt === undefined) {
    return null;
  }
  if (!sameScopeItemIds(existing.scopeItemIds, next.scopeItemIds)) {
    throwDomain(new ValidationFailedError({ message: GOAL_SCOPE_FROZEN_MESSAGE }));
  }
  return null;
}
