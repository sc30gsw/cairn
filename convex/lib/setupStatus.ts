import { v } from "convex/values";

export const setupStatusValidator = v.object({
  hasExamGoal: v.boolean(),
  hasItems: v.boolean(),
  hasPresets: v.boolean(),
  hasWeeklyTargets: v.boolean(),
  isComplete: v.boolean(),
});

export type SetupStatus = {
  hasExamGoal: boolean;
  hasItems: boolean;
  hasPresets: boolean;
  hasWeeklyTargets: boolean;
  isComplete: boolean;
};

export function computeSetupStatus(input: {
  hasExamGoal: boolean;
  hasItems: boolean;
  hasPresets: boolean;
  hasWeeklyTargets: boolean;
}): SetupStatus {
  const { hasExamGoal, hasItems, hasPresets, hasWeeklyTargets } = input;

  return {
    hasExamGoal,
    hasItems,
    hasPresets,
    hasWeeklyTargets,
    isComplete: hasItems && hasPresets && hasExamGoal && hasWeeklyTargets,
  };
}
