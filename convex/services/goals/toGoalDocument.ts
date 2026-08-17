import type { GoalInput } from "../../lib/validators";

//* 入力 + 所有者から挿入用ドキュメントを作る。達成量の currentAmount は startAmount から導出(CVX-09: 純関数)。
export function toGoalDocument(input: GoalInput, ownerId: string) {
  if (input.type === "volume") {
    return { ...input, currentAmount: input.startAmount ?? 0, ownerId };
  }
  return { ...input, ownerId };
}
