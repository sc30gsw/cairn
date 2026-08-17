import { expect, test } from "vite-plus/test";

import { isGoalType, isTargetMetric } from "~/features/goals/lib/goal-guards";

test.each(["exam", "mastery"])("isGoalType は %s をドメイン値として認める", (value) => {
  expect(isGoalType(value)).toBe(true);
});

test.each(["pace", "volume", "other", "okr"])(
  "isGoalType は廃止・ドメイン外の %s を弾く",
  (value) => {
    expect(isGoalType(value)).toBe(false);
  },
);

test.each(["minutes", "days", "count"])(
  "isTargetMetric は %s をドメイン値として認める",
  (value) => {
    expect(isTargetMetric(value)).toBe(true);
  },
);

test("isTargetMetric はドメイン外の文字列を弾く", () => {
  expect(isTargetMetric("hours")).toBe(false);
});
