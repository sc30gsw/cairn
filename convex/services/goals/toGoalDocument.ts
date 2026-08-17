import type { GoalInput, MasteryProgress } from "../../lib/validators";

//* 入力 + 所有者から保存用ドキュメントを作る(CVX-09: 純関数)。
//? 達成日(achievedAt)は入力に含まれない。setAchieved だけが書き、編集では触らない。
//? 学習量の実績も入力ではない。作成時の初期値・更新時の据え置き値を呼び出し側が渡す(ADR-0007)。
export function toGoalDocument(input: GoalInput, ownerId: string, progress: MasteryProgress) {
  if (input.type === "mastery") {
    return { ...input, ...progress, ownerId };
  }
  return { ...input, ownerId };
}
