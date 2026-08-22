import { v } from "convex/values";

export const setupStatusValidator = v.object({
  examGoalCount: v.number(),
  hasExamGoal: v.boolean(),
  hasItems: v.boolean(),
  hasPresets: v.boolean(),
  hasWeeklyTargets: v.boolean(),
  isComplete: v.boolean(),
  itemCount: v.number(),
  presetCount: v.number(),
  targetCount: v.number(),
});

export type SetupStatus = {
  examGoalCount: number;
  hasExamGoal: boolean;
  hasItems: boolean;
  hasPresets: boolean;
  hasWeeklyTargets: boolean;
  isComplete: boolean;
  itemCount: number;
  presetCount: number;
  targetCount: number;
};

export function computeSetupStatus(input: {
  examGoalCount: number;
  itemCount: number;
  presetCount: number;
  targetCount: number;
}): SetupStatus {
  const hasItems = input.itemCount > 0;
  const hasPresets = input.presetCount > 0;
  const hasExamGoal = input.examGoalCount > 0;
  const hasWeeklyTargets = input.targetCount > 0;

  return {
    examGoalCount: input.examGoalCount,
    hasExamGoal,
    hasItems,
    hasPresets,
    hasWeeklyTargets,
    isComplete: hasItems && hasPresets && hasExamGoal && hasWeeklyTargets,
    itemCount: input.itemCount,
    presetCount: input.presetCount,
    targetCount: input.targetCount,
  };
}
