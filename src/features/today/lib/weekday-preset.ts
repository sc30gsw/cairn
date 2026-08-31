import { type DateJst, weekdayFromDateJst } from "~domain/jst";

import type { PresetDto } from "~/types/item";

export function weekdayPresetId(dateJst: DateJst, presets: PresetDto[]) {
  return presets.find((preset) => preset.weekday === weekdayFromDateJst(dateJst))?._id ?? null;
}
