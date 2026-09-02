import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type CreateCategoryInput = FunctionArgs<typeof api.mutations.categories.create.create>;
export type RenameCategoryInput = FunctionArgs<typeof api.mutations.categories.rename.rename>;
export type RemoveCategoryInput = Pick<
  FunctionArgs<typeof api.mutations.categories.remove.remove>,
  "categoryId"
>;
export type CreateItemInput = FunctionArgs<typeof api.mutations.items.create.create>;
export type RenameItemInput = FunctionArgs<typeof api.mutations.items.rename.rename>;
export type ApplyItemOrderInput = FunctionArgs<typeof api.mutations.items.applyOrder.applyOrder>;
export type RemoveItemInput = Pick<
  FunctionArgs<typeof api.mutations.items.remove.remove>,
  "itemId"
>;
export type CreatePresetInput = FunctionArgs<typeof api.mutations.presets.create.create>;
export type UpdatePresetInput = FunctionArgs<typeof api.mutations.presets.update.update>;
export type SavePresetSettingsInput = FunctionArgs<
  typeof api.mutations.presets.saveSettings.saveSettings
>;
export type RemovePresetInput = Pick<
  FunctionArgs<typeof api.mutations.presets.remove.remove>,
  "presetId"
>;
