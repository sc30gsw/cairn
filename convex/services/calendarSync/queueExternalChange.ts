import { internal } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import type { ExternalChange } from "../../lib/validators";

export async function queueExternalChange(
  ctx: MutationCtx,
  args: { calendarId: string; change: ExternalChange; googleEventId: string; ownerId: string },
): Promise<void> {
  const previous = await ctx.db
    .query("calendarExternalChanges")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q
        .eq("ownerId", args.ownerId)
        .eq("calendarId", args.calendarId)
        .eq("googleEventId", args.googleEventId),
    )
    .unique();
  if (previous !== null) {
    await ctx.db.delete("calendarExternalChanges", previous._id);
  }
  const pendingId = await ctx.db.insert("calendarExternalChanges", args);
  await ctx.scheduler.runAfter(0, internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 0,
    pendingId,
  });
}
