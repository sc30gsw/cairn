import { expect, test } from "vite-plus/test";

import { isTargetMetric } from "~/features/goals/lib/goal-guards";

test.each(["minutes", "days", "count"])(
  "isTargetMetric は %s をドメイン値として認める",
  (value) => {
    expect(isTargetMetric(value)).toBe(true);
  },
);

test("isTargetMetric はドメイン外の文字列を弾く", () => {
  expect(isTargetMetric("hours")).toBe(false);
});
