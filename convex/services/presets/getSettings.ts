import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { PRESET_SETTINGS_DEFAULTS } from "../../lib/domain";
import type { PresetSettingsDto } from "../../lib/validators";

export async function getSettings(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<PresetSettingsDto> {
  const row = await ctx.db
    .query("presetSettings")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
  if (row === null) {
    return { ...PRESET_SETTINGS_DEFAULTS };
  }
  return { holidayAsSunday: row.holidayAsSunday };
}
