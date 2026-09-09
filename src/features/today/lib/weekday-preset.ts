import { type DateJst, weekdayFromDateJst } from "~domain/jst";

import type { PresetDto } from "~/types/item";

export function weekdayPresetId(dateJst: DateJst, presets: PresetDto[]) {
  const weekday = weekdayFromDateJst(dateJst);
  return presets.find((preset) => preset.weekdays.includes(weekday))?._id ?? null;
}
