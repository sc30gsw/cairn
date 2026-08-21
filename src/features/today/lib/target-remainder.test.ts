import { expect, test } from "vite-plus/test";

import { targetRemainder, targetRemainderMessage } from "~/features/today/lib/target-remainder";
import type { TargetProgress } from "~/features/today/types/targets";

const minutesTarget = {
  _id: "t1" as TargetProgress["_id"],
  achieved: false,
  categoryId: "c1" as TargetProgress["categoryId"],
  categoryName: "多聴",
  current: 20,
  metric: "minutes",
  targetValue: 50,
} satisfies TargetProgress;

test("該当カテゴリの残量を出す", () => {
  expect(targetRemainder([minutesTarget], "多聴")).toEqual({
    achieved: false,
    categoryName: "多聴",
    remaining: 30,
    unit: "分",
  });
});

test("ターゲットが無いカテゴリは null", () => {
  expect(targetRemainder([minutesTarget], "英会話")).toBeNull();
});

test("達成済みは remaining 0", () => {
  expect(targetRemainder([{ ...minutesTarget, achieved: true, current: 50 }], "多聴")).toEqual({
    achieved: true,
    categoryName: "多聴",
    remaining: 0,
    unit: "分",
  });
});

test("超過しても remaining は 0", () => {
  expect(targetRemainder([{ ...minutesTarget, current: 80 }], "多聴")?.remaining).toBe(0);
});

test("文言は残量と達成で分かれる", () => {
  expect(
    targetRemainderMessage({ achieved: false, categoryName: "多聴", remaining: 30, unit: "分" }),
  ).toBe("多聴 今週の週間ターゲット あと30分");
  expect(
    targetRemainderMessage({ achieved: true, categoryName: "多聴", remaining: 0, unit: "分" }),
  ).toBe("多聴 今週の週間ターゲット 達成");
});
