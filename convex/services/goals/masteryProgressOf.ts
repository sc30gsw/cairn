import type { Doc } from "../../_generated/dataModel";
import type { MasteryProgress } from "../../lib/validators";

export type MasteryGoal = Extract<Doc<"goals">, Record<"type", "mastery">>;

//* 保存カウンタの読み出し口。2フィールドを呼び出し側で書き並べない(CVX-16: 形は validators が SSoT)。
export function masteryProgressOf(goal: MasteryGoal): MasteryProgress {
  return { activeDays: goal.activeDays, confirmedMinutes: goal.confirmedMinutes };
}
