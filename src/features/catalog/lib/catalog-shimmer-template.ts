import type { CategoryDto, ItemDto, PresetDto } from "~/features/catalog/types/item";

const categoryId = "shimmer-category" as CategoryDto["_id"];
const itemId = "shimmer-item" as ItemDto["_id"];

export const catalogShimmerCategories = [
  { _id: categoryId, name: "多聴", sortOrder: 1 },
  { _id: "shimmer-category-2" as CategoryDto["_id"], name: "英会話", sortOrder: 2 },
] satisfies CategoryDto[];

export const catalogShimmerItems = [
  { _id: itemId, categoryId, name: "Distinction 2000", sortOrder: 0 },
  {
    _id: "shimmer-item-2" as ItemDto["_id"],
    categoryId: "shimmer-category-2" as ItemDto["categoryId"],
    name: "英会話",
    sortOrder: 0,
  },
] satisfies ItemDto[];

export const catalogShimmerPresets = [
  {
    _id: "shimmer-preset" as PresetDto["_id"],
    lines: [
      { content: "", itemId, itemName: "Distinction 2000", minutes: 30 },
      {
        content: "会話",
        itemId: "shimmer-item-2" as PresetDto["lines"][number]["itemId"],
        itemName: "英会話",
        minutes: 20,
      },
    ],
    name: "月曜日",
    weekday: 1,
  },
  {
    _id: "shimmer-preset-2" as PresetDto["_id"],
    lines: [{ content: "", itemId, itemName: "Distinction 2000", minutes: 30 }],
    name: "火曜日",
    weekday: 2,
  },
] satisfies PresetDto[];
