import type { MutationCtx } from "../../_generated/server";
import type { PresetSettingsDto } from "../../lib/validators";

export async function saveSettings(
  ctx: MutationCtx,
  ownerId: string,
  args: PresetSettingsDto,
): Promise<null> {
  const row = await ctx.db
    .query("presetSettings")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
  if (row === null) {
    await ctx.db.insert("presetSettings", { holidayAsSunday: args.holidayAsSunday, ownerId });
  } else {
    await ctx.db.patch("presetSettings", row._id, { holidayAsSunday: args.holidayAsSunday });
  }
  return null;
}
