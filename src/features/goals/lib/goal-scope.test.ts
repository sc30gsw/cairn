import { expect, test } from "vite-plus/test";

import {
  ALL_RECORDS_LABEL,
  ALL_RECORDS_SHORT,
  goalScopeLabel,
  goalScopeOptions,
  resolveScopeItemIds,
} from "~/features/goals/lib/goal-scope";
import {
  INPUT_CATEGORY,
  KINFURE_ITEM,
  OFFICIAL_ITEM,
  OUTPUT_CATEGORY,
  scopeCategoriesFixture,
  scopeItemsFixture,
  SHADOWING_ITEM,
} from "~/features/goals/mocks/goal-scope-fixture";
import type { ItemId } from "~/types/item";

const UNKNOWN = "item-gone" as ItemId;

test("対象項目が未指定・空なら「すべての記録」", () => {
  for (const scope of [undefined, []]) {
    expect(goalScopeLabel(scope, scopeItemsFixture)).toEqual({
      full: ALL_RECORDS_LABEL,
      itemCount: 0,
      short: ALL_RECORDS_SHORT,
    });
  }
});

test("1件なら full も short も項目名", () => {
  expect(goalScopeLabel([KINFURE_ITEM._id], scopeItemsFixture)).toEqual({
    full: "金フレ",
    itemCount: 1,
    short: "金フレ",
  });
});

test("3件なら full は全項目名、short は先頭 +2。並びは items の順に従う", () => {
  expect(
    goalScopeLabel([SHADOWING_ITEM._id, OFFICIAL_ITEM._id, KINFURE_ITEM._id], scopeItemsFixture),
  ).toEqual({
    full: "金フレ / 公式問題集 / 音読パッケージ",
    itemCount: 3,
    short: "金フレ +2",
  });
});

test("引き当てられない項目は件数だけを出す(安全網)", () => {
  expect(goalScopeLabel([KINFURE_ITEM._id, UNKNOWN], scopeItemsFixture)).toEqual({
    full: "金フレ / 不明な項目1件",
    itemCount: 2,
    short: "金フレ +1",
  });
  expect(goalScopeLabel([UNKNOWN], scopeItemsFixture)).toEqual({
    full: "不明な項目1件",
    itemCount: 1,
    short: "不明な項目1件",
  });
});

test("重複した対象項目は1件として数える", () => {
  expect(goalScopeLabel([KINFURE_ITEM._id, KINFURE_ITEM._id], scopeItemsFixture)).toEqual({
    full: "金フレ",
    itemCount: 1,
    short: "金フレ",
  });
});

test("選択肢はカテゴリ見出し付きで、空グループは含めない", () => {
  expect(goalScopeOptions(scopeItemsFixture, scopeCategoriesFixture)).toEqual([
    {
      group: INPUT_CATEGORY.name,
      items: [
        { label: "金フレ", value: KINFURE_ITEM._id },
        { label: "公式問題集", value: OFFICIAL_ITEM._id },
      ],
    },
    {
      group: OUTPUT_CATEGORY.name,
      items: [{ label: "音読パッケージ", value: SHADOWING_ITEM._id }],
    },
  ]);
  //? 項目が1件も無いカテゴリは見出しごと出さない
  expect(goalScopeOptions([KINFURE_ITEM], scopeCategoriesFixture)).toEqual([
    { group: INPUT_CATEGORY.name, items: [{ label: "金フレ", value: KINFURE_ITEM._id }] },
  ]);
});

test("引き当ては解決できた id と未解決の値を分けて返す", () => {
  expect(resolveScopeItemIds([KINFURE_ITEM._id, UNKNOWN], scopeItemsFixture)).toEqual({
    itemIds: [KINFURE_ITEM._id],
    unresolved: [UNKNOWN],
  });
  expect(resolveScopeItemIds([], scopeItemsFixture)).toEqual({ itemIds: [], unresolved: [] });
});
