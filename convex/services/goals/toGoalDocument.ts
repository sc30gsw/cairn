import type { GoalInput, MasteryProgress } from "../../lib/validators";

export type GoalDocumentInput =
  | Extract<GoalInput, Record<"type", "exam">>
  | (Extract<GoalInput, Record<"type", "mastery">> & MasteryProgress);

export function toGoalDocument<Input extends GoalDocumentInput>(input: Input, ownerId: string) {
  return { ...input, ownerId };
}
