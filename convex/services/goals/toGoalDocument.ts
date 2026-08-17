import type { GoalInput, MasteryProgress } from "../../lib/validators";

//? 学習量の実績は習得だけが持つ。本番の入力に progress を混ぜられないよう型で閉じる(ADR-0007)。
export type GoalDocumentInput =
  | Extract<GoalInput, Record<"type", "exam">>
  | (Extract<GoalInput, Record<"type", "mastery">> & MasteryProgress);

//* 入力 + 所有者から保存用ドキュメントを作る(CVX-09: 純関数)。
//? 達成日(achievedAt)は入力に含まれない。setAchieved だけが書き、編集では触らない。
//? 入力のタイプごとの形をそのまま返す(呼び出し側で achievedAt を足せるように union を潰さない)。
export function toGoalDocument<Input extends GoalDocumentInput>(input: Input, ownerId: string) {
  return { ...input, ownerId };
}
