import { expect, test } from "vite-plus/test";

import { computeSetupStatus } from "./setupStatus";

test("空のカタログは未完了", () => {
  expect(
    computeSetupStatus({
      examGoalCount: 0,
      itemCount: 0,
      presetCount: 0,
      targetCount: 0,
    }),
  ).toEqual({
    examGoalCount: 0,
    hasExamGoal: false,
    hasItems: false,
    hasPresets: false,
    hasWeeklyTargets: false,
    isComplete: false,
    itemCount: 0,
    presetCount: 0,
    targetCount: 0,
  });
});

test("4条件が揃えば完了", () => {
  expect(
    computeSetupStatus({
      examGoalCount: 1,
      itemCount: 2,
      presetCount: 1,
      targetCount: 3,
    }).isComplete,
  ).toBe(true);
});

test("1つでも欠ければ未完了", () => {
  expect(
    computeSetupStatus({
      examGoalCount: 1,
      itemCount: 1,
      presetCount: 1,
      targetCount: 0,
    }).isComplete,
  ).toBe(false);
});
