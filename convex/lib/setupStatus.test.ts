import { expect, test } from "vite-plus/test";

import { computeSetupStatus } from "./setupStatus";

test("空のカタログは未完了", () => {
  expect(
    computeSetupStatus({
      hasExamGoal: false,
      hasItems: false,
      hasPresets: false,
      hasWeeklyTargets: false,
    }),
  ).toEqual({
    hasExamGoal: false,
    hasItems: false,
    hasPresets: false,
    hasWeeklyTargets: false,
    isComplete: false,
  });
});

test("4条件が揃えば完了", () => {
  expect(
    computeSetupStatus({
      hasExamGoal: true,
      hasItems: true,
      hasPresets: true,
      hasWeeklyTargets: true,
    }).isComplete,
  ).toBe(true);
});

test("1つでも欠ければ未完了", () => {
  expect(
    computeSetupStatus({
      hasExamGoal: true,
      hasItems: true,
      hasPresets: true,
      hasWeeklyTargets: false,
    }).isComplete,
  ).toBe(false);
});
