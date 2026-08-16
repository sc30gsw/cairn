import { expect, test } from "vite-plus/test";

import { applyItemOrderToList, applyRenameToList } from "./itemOrder";
import type { ItemDto } from "./validators";

const itemA = {
  _id: "i1" as ItemDto["_id"],
  categoryId: "c1" as ItemDto["categoryId"],
  name: "Distinction 2000",
  sortOrder: 0,
} satisfies ItemDto;

const itemB = {
  _id: "i2" as ItemDto["_id"],
  categoryId: "c1" as ItemDto["categoryId"],
  name: "英会話",
  sortOrder: 1,
} satisfies ItemDto;

const itemC = {
  _id: "i3" as ItemDto["_id"],
  categoryId: "c2" as ItemDto["categoryId"],
  name: "多読",
  sortOrder: 0,
} satisfies ItemDto;

test("同一カテゴリ内の並べ替えを楽観的に反映する", () => {
  expect(
    applyItemOrderToList(
      [itemA, itemB],
      [{ categoryId: "c1" as ItemDto["categoryId"], orderedItemIds: [itemB._id, itemA._id] }],
    ),
  ).toEqual([
    { ...itemA, sortOrder: 1 },
    { ...itemB, sortOrder: 0 },
  ]);
});

test("カテゴリ間移動と両方の並べ替えを反映する", () => {
  expect(
    applyItemOrderToList(
      [itemA, itemB, itemC],
      [
        { categoryId: "c1" as ItemDto["categoryId"], orderedItemIds: [itemB._id] },
        {
          categoryId: "c2" as ItemDto["categoryId"],
          orderedItemIds: [itemC._id, itemA._id],
        },
      ],
    ),
  ).toEqual([
    { ...itemA, categoryId: itemC.categoryId, sortOrder: 1 },
    { ...itemB, sortOrder: 0 },
    { ...itemC, sortOrder: 0 },
  ]);
});

test("更新対象外の項目はそのまま", () => {
  expect(applyItemOrderToList([itemA, itemC], [])).toEqual([itemA, itemC]);
});

test("同一カテゴリ内の名前変更を楽観的に反映する", () => {
  expect(
    applyRenameToList([itemA, itemB], {
      categoryId: itemA.categoryId,
      itemId: itemA._id,
      name: "Distinction 3000",
    }),
  ).toEqual([{ ...itemA, name: "Distinction 3000" }, itemB]);
});

test("別カテゴリへの移動時は末尾の sortOrder を付与する", () => {
  expect(
    applyRenameToList([itemA, itemB, itemC], {
      categoryId: itemC.categoryId,
      itemId: itemA._id,
      name: "多読 Distinction",
    }),
  ).toEqual([
    { ...itemA, categoryId: itemC.categoryId, name: "多読 Distinction", sortOrder: 1 },
    itemB,
    itemC,
  ]);
});

test("存在しない項目 ID はリストを変えない", () => {
  expect(
    applyRenameToList([itemA], {
      categoryId: itemA.categoryId,
      itemId: "missing" as ItemDto["_id"],
      name: "存在しない",
    }),
  ).toEqual([itemA]);
});
