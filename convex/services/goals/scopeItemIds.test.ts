import { expect, test } from "vite-plus/test";

import type { Id } from "../../_generated/dataModel";
import { normalizeScopeItemIds, sameScopeItemIds } from "./scopeItemIds";

const KINFURE = "item-kinfure" as Id<"items">;
const TADOKU = "item-tadoku" as Id<"items">;

test("正規化は重複を落とし、空を undefined に畳む", () => {
  expect(normalizeScopeItemIds([KINFURE, TADOKU, KINFURE])).toEqual([KINFURE, TADOKU]);
  expect(normalizeScopeItemIds([])).toBeUndefined();
  expect(normalizeScopeItemIds(undefined)).toBeUndefined();
  //? 順序は入力のまま(最初に現れた位置を残す)
  expect(normalizeScopeItemIds([TADOKU, KINFURE])).toEqual([TADOKU, KINFURE]);
});

test("対象項目の比較は順序と重複を無視する", () => {
  expect(sameScopeItemIds([KINFURE, TADOKU], [TADOKU, KINFURE])).toBe(true);
  expect(sameScopeItemIds([KINFURE, KINFURE], [KINFURE])).toBe(true);
});

test("undefined と [] はどちらも「すべての記録」なので同一", () => {
  expect(sameScopeItemIds(undefined, [])).toBe(true);
  expect(sameScopeItemIds([], undefined)).toBe(true);
  expect(sameScopeItemIds(undefined, undefined)).toBe(true);
});

test("要素が違えば別の対象項目", () => {
  expect(sameScopeItemIds([KINFURE], [TADOKU])).toBe(false);
  expect(sameScopeItemIds([KINFURE], [KINFURE, TADOKU])).toBe(false);
  expect(sameScopeItemIds(undefined, [KINFURE])).toBe(false);
});
