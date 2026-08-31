import type { Doc } from "../../_generated/dataModel";
import type { MasteryProgress } from "../../lib/validators";

export type MasteryGoal = Extract<Doc<"goals">, Record<"type", "mastery">>;

export function masteryProgressOf(goal: MasteryGoal): MasteryProgress {
  return { activeDays: goal.activeDays, confirmedMinutes: goal.confirmedMinutes };
}
