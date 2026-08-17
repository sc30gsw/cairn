import { Result } from "better-result";

import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { validateGoalInput } from "./validateGoalInput";

//* 作成と更新に共通する入力検証。想定内の失敗を持つ Result を、mutation の境界でドメインエラーに変える。
export function assertGoalInput(goal: GoalInput): null {
  const validated = validateGoalInput(goal);
  if (Result.isError(validated)) {
    throwDomain(validated.error);
  }
  return null;
}
