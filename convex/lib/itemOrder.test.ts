import { expect, test } from "vite-plus/test";

import { applyItemOrderToList } from "./itemOrder";
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
