import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

export async function loadDueSettings(
  ctx: MutationCtx,
  args: { fixedDue: boolean; hour: number },
): Promise<Doc<"notificationSettings">[]> {
  if (args.fixedDue) {
    return await ctx.db
      .query("notificationSettings")
      .withIndex("by_enabled_and_eveningHourJst", (q) => q.eq("enabled", true))
      .collect();
  }
  return await ctx.db
    .query("notificationSettings")
    .withIndex("by_enabled_and_eveningHourJst", (q) =>
      q.eq("enabled", true).eq("eveningHourJst", args.hour),
    )
    .collect();
}
