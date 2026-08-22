import { expect, test } from "vite-plus/test";

import {
  firstIncompleteSetupStep,
  incompleteSetupSteps,
  isSetupStepComplete,
  shouldShowHomeSetupStepper,
  visibleSetupStep,
} from "~/features/onboarding/lib/setup-steps";

const emptyStatus = {
  hasExamGoal: false,
  hasItems: false,
  hasPresets: false,
  hasWeeklyTargets: false,
  isComplete: false,
};

test("最初の未完了ステップは項目", () => {
  const step = firstIncompleteSetupStep(emptyStatus, new Set());
  expect(step?.id).toBe("items");
});

test("項目だけ完了ならプリセットが次", () => {
  const step = firstIncompleteSetupStep({ ...emptyStatus, hasItems: true }, new Set());
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
        hasExamGoal: true,
        hasItems: true,
        hasPresets: true,
        hasWeeklyTargets: true,
        isComplete: true,
      },
      new Set(),
    ),
  ).toBe(false);
});

test("isSetupStepComplete は status を参照する", () => {
  expect(isSetupStepComplete({ ...emptyStatus, hasExamGoal: true }, "examGoal")).toBe(true);
});

test("incompleteSetupSteps は未完了だけ返す", () => {
  const steps = incompleteSetupSteps({ ...emptyStatus, hasItems: true });
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

test("全部 dismiss かつ未完了でも visibleSetupStep は最初の未完了を返す", () => {
  const dismissed = new Set(["items", "presets", "examGoal", "weeklyTargets"] as const);
  const step = visibleSetupStep(emptyStatus, dismissed);
  expect(step?.id).toBe("items");
});

test("全部 dismiss かつ未完了でもホーム Stepper は表示する", () => {
  expect(
    shouldShowHomeSetupStepper(
      emptyStatus,
      new Set(["items", "presets", "examGoal", "weeklyTargets"]),
    ),
  ).toBe(true);
});
