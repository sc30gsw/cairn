import { expect, test } from "vite-plus/test";

import { isGoalType, isVolumeUnit } from "~/features/goals/lib/goal-guards";

test.each(["exam", "pace", "volume", "mastery", "other"])(
  "isGoalType は %s をドメイン値として認める",
  (value) => {
    expect(isGoalType(value)).toBe(true);
  },
);

test("isGoalType はドメイン外の文字列を弾く", () => {
  expect(isGoalType("okr")).toBe(false);
});

test.each(["分", "ページ", "問題", "回", "冊"])(
  "isVolumeUnit は %s をドメイン値として認める",
  (value) => {
    expect(isVolumeUnit(value)).toBe(true);
  },
);

test("isVolumeUnit はドメイン外の文字列を弾く", () => {
  expect(isVolumeUnit("キロ")).toBe(false);
});
