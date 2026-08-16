import type { CategoryDto, ItemDto, PresetDto } from "~/features/catalog/types/item";
import { shimmerId } from "~/lib/shimmer-id";

const categoryId = shimmerId<CategoryDto["_id"]>("category");
const itemId = shimmerId<ItemDto["_id"]>("item");
const itemId2 = shimmerId<ItemDto["_id"]>("item-2");

export const catalogShimmerCategories = [
  { _id: categoryId, name: "多聴", sortOrder: 1 },
  { _id: shimmerId<CategoryDto["_id"]>("category-2"), name: "英会話", sortOrder: 2 },
] satisfies CategoryDto[];

export const catalogShimmerItems = [
  { _id: itemId, categoryId, name: "Distinction 2000", sortOrder: 0 },
  {
    _id: itemId2,
    categoryId: shimmerId<ItemDto["categoryId"]>("category-2"),
    name: "英会話",
    sortOrder: 0,
  },
] satisfies ItemDto[];

export const catalogShimmerPresets = [
  {
    _id: shimmerId<PresetDto["_id"]>("preset"),
    lines: [
      { content: "", itemId, itemName: "Distinction 2000", minutes: 30 },
      {
        content: "会話",
        itemId: itemId2,
        itemName: "英会話",
        minutes: 20,
      },
    ],
    name: "月曜日",
    weekday: 1,
  },
  {
    _id: shimmerId<PresetDto["_id"]>("preset-2"),
    lines: [{ content: "", itemId, itemName: "Distinction 2000", minutes: 30 }],
    name: "火曜日",
    weekday: 2,
  },
] satisfies PresetDto[];
