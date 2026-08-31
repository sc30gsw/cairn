import type { CategoryDto } from "~/types/category";
import type { ItemDto } from "~/types/item";

export const INPUT_CATEGORY = {
  _id: "category-input" as CategoryDto["_id"],
  name: "インプット",
  sortOrder: 0,
} satisfies CategoryDto;

export const OUTPUT_CATEGORY = {
  _id: "category-output" as CategoryDto["_id"],
  name: "アウトプット",
  sortOrder: 1,
} satisfies CategoryDto;

export const scopeCategoriesFixture = [INPUT_CATEGORY, OUTPUT_CATEGORY] satisfies CategoryDto[];

export const KINFURE_ITEM = {
  _id: "item-kinfure" as ItemDto["_id"],
  categoryId: INPUT_CATEGORY._id,
  name: "金フレ",
  sortOrder: 0,
} satisfies ItemDto;

export const OFFICIAL_ITEM = {
  _id: "item-official" as ItemDto["_id"],
  categoryId: INPUT_CATEGORY._id,
  name: "公式問題集",
  sortOrder: 1,
} satisfies ItemDto;

export const SHADOWING_ITEM = {
  _id: "item-shadowing" as ItemDto["_id"],
  categoryId: OUTPUT_CATEGORY._id,
  name: "音読パッケージ",
  sortOrder: 2,
} satisfies ItemDto;

export const scopeItemsFixture = [KINFURE_ITEM, OFFICIAL_ITEM, SHADOWING_ITEM] satisfies ItemDto[];
