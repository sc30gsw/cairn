import { expect, test } from "vite-plus/test";

import { monthDayOverlayAttrs } from "~/features/history/lib/month-day-overlay";

test("学習量がある日は分と均を出す", () => {
  expect(monthDayOverlayAttrs({ condition: null, minutes: 30, movingAverage: 10.4 })).toEqual({
    "data-avg": "10",
    "data-volume": "30",
  });
});

test("コンディションがあるときだけ data-condition を付ける", () => {
  expect(monthDayOverlayAttrs({ condition: "好調", minutes: 0, movingAverage: 0 })).toEqual({
    "data-condition": "好調",
  });
});

test("未設定はコンディション属性に出さない", () => {
  expect(monthDayOverlayAttrs({ condition: null, minutes: 0, movingAverage: 0 })).toEqual({});
});
