import { expect, test } from "vite-plus/test";

import {
  firstIncompleteSetupStep,
  incompleteSetupSteps,
  isSetupStepComplete,
  shouldShowHomeSetupStepper,
} from "~/features/onboarding/lib/setup-steps";

const emptyStatus = {
  examGoalCount: 0,
  hasExamGoal: false,
  hasItems: false,
  hasPresets: false,
  hasWeeklyTargets: false,
  isComplete: false,
  itemCount: 0,
  presetCount: 0,
  targetCount: 0,
};

test("最初の未完了ステップは項目", () => {
  const step = firstIncompleteSetupStep(emptyStatus, new Set());
  expect(step?.id).toBe("items");
});

test("項目だけ完了ならプリセットが次", () => {
  const step = firstIncompleteSetupStep(
    { ...emptyStatus, hasItems: true, itemCount: 1 },
    new Set(),
  );
  expect(step?.id).toBe("presets");
});

test("dismiss されたステップはスキップする", () => {
  const step = firstIncompleteSetupStep(emptyStatus, new Set(["items"]));
  expect(step?.id).toBe("presets");
});

test("全部完了ならホーム Stepper は非表示", () => {
  expect(
    shouldShowHomeSetupStepper(
      {
        examGoalCount: 1,
        hasExamGoal: true,
        hasItems: true,
        hasPresets: true,
        hasWeeklyTargets: true,
        isComplete: true,
        itemCount: 1,
        presetCount: 1,
        targetCount: 1,
      },
      new Set(),
    ),
  ).toBe(false);
});

test("isSetupStepComplete は status を参照する", () => {
  expect(isSetupStepComplete({ ...emptyStatus, hasExamGoal: true }, "examGoal")).toBe(true);
});

test("incompleteSetupSteps は未完了だけ返す", () => {
  const steps = incompleteSetupSteps({ ...emptyStatus, hasItems: true, itemCount: 1 });
  expect(steps.map((step) => step.id)).toEqual(["presets", "examGoal", "weeklyTargets"]);
});

test("未完了が残っていればホーム Stepper を表示する", () => {
  expect(shouldShowHomeSetupStepper(emptyStatus, new Set())).toBe(true);
});

test("全部 dismiss かつ未完了なら firstIncompleteSetupStep は null", () => {
  const step = firstIncompleteSetupStep(
    emptyStatus,
    new Set(["items", "presets", "examGoal", "weeklyTargets"]),
  );
  expect(step).toBeNull();
});
