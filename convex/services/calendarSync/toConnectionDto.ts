import type { Doc } from "../../_generated/dataModel";
import type { CalendarConnectionDto } from "../../lib/validators";

export function toConnectionDto(
  connection: Doc<"calendarConnections"> | null,
): CalendarConnectionDto {
  if (connection === null) {
    return null;
  }
  return {
    calendars: connection.calendars,
    googleEmail: connection.googleEmail ?? null,
    lastError: connection.lastError ?? null,
    lastSyncedAt: connection.lastSyncedAt ?? null,
    status: connection.status,
    visibleCalendarIds: connection.visibleCalendarIds,
  };
}
