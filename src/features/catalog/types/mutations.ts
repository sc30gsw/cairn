import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type CreateCategoryInput = FunctionArgs<typeof api.categories.create>;
export type RenameCategoryInput = FunctionArgs<typeof api.categories.rename>;
export type RemoveCategoryInput = Pick<FunctionArgs<typeof api.categories.remove>, "categoryId">;
export type CreateItemInput = FunctionArgs<typeof api.items.create>;
export type RenameItemInput = FunctionArgs<typeof api.items.rename>;
export type ApplyItemOrderInput = FunctionArgs<typeof api.items.applyOrder>;
export type ReorderItemsInput = FunctionArgs<typeof api.items.reorder>;
export type RemoveItemInput = Pick<FunctionArgs<typeof api.items.remove>, "itemId">;
export type CreatePresetInput = FunctionArgs<typeof api.presets.create>;
export type UpdatePresetInput = FunctionArgs<typeof api.presets.update>;
export type RemovePresetInput = Pick<FunctionArgs<typeof api.presets.remove>, "presetId">;
