import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type ItemDto = FunctionReturnType<typeof api.items.list>[number];
export type PresetDto = FunctionReturnType<typeof api.presets.list>[number];
export type ItemId = ItemDto["_id"];
export type PresetId = PresetDto["_id"];

export function parseItemId(itemId: string): ItemId {
  if (itemId === "") {
    throw new Error("項目を選んでください");
  }
  return itemId as ItemId;
}

export function parsePresetId(presetId: string): PresetId {
  if (presetId === "") {
    throw new Error("プリセットを選んでください");
  }
  return presetId as PresetId;
}
