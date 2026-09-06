import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function findAppLink(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  calendarId: string,
  googleEventId: string,
) {
  const linked = await ctx.db
    .query("calendarSyncLinks")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q.eq("ownerId", ownerId).eq("calendarId", calendarId).eq("googleEventId", googleEventId),
    )
    .unique();
  return (
    linked ??
    ctx.db
      .query("calendarSyncLinks")
      .withIndex("by_owner_and_pendingCalendarId_and_pendingGoogleEventId", (q) =>
        q
          .eq("ownerId", ownerId)
          .eq("pendingMove.calendarId", calendarId)
          .eq("pendingMove.googleEventId", googleEventId),
      )
      .unique()
  );
}
