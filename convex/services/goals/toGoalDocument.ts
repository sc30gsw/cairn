import type { GoalInput } from "../../lib/validators";

//* 入力 + 所有者から保存用ドキュメントを作る(CVX-09: 純関数)。
//? 達成日(achievedAt)は入力に含まれない。setAchieved だけが書き、編集では触らない。
export function toGoalDocument(input: GoalInput, ownerId: string) {
  return { ...input, ownerId };
}
