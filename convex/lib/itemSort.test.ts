import { expect, test } from "vite-plus/test";

import { compareItemsBySortOrder, effectiveItemSortOrder } from "./itemSort";

test("sortOrder 未設定は末尾扱い", () => {
  expect(effectiveItemSortOrder(undefined)).toBe(Number.MAX_SAFE_INTEGER);
  expect(
    compareItemsBySortOrder({ name: "あ", sortOrder: undefined }, { name: "い", sortOrder: 0 }),
  ).toBeGreaterThan(0);
});

test("同順位なら日本語名順", () => {
  expect(
    compareItemsBySortOrder({ name: "い", sortOrder: 0 }, { name: "あ", sortOrder: 0 }),
  ).toBeGreaterThan(0);
});
