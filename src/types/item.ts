import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import type { CategoryId } from "~/types/category";

//? catalog と today の両方が使う共有の型。features 間 import を避けてここに置く
export type ItemDto = FunctionReturnType<typeof api.queries.items.list.list>[number];
export type PresetDto = FunctionReturnType<typeof api.queries.presets.list.list>[number];
export type ItemId = ItemDto["_id"];
export type PresetId = PresetDto["_id"];

export function parseItemId(itemId: string): ItemId {
  if (itemId === "") {
    throw new Error("項目を選んでください");
  }
  return itemId as ItemId;
}

export function parseCategoryId(categoryId: string): CategoryId {
  if (categoryId === "") {
    throw new Error("カテゴリーを選んでください");
  }
  return categoryId as CategoryId;
}

export function parsePresetId(presetId: string): PresetId {
  if (presetId === "") {
    throw new Error("プリセットを選んでください");
  }
  return presetId as PresetId;
}
