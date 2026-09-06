import type { Doc } from "../../_generated/dataModel";
import type { CalendarConnectionDto } from "../../lib/validators";

export function toConnectionDto(connection: Doc<"calendarConnections">): CalendarConnectionDto {
  return {
    connectionId: connection._id,
    googleAccountId: connection.googleAccountId,
    externalReadOnly: connection.externalReadOnly === true,
    canWrite: connection.canWrite !== false,
    calendars: connection.calendars,
    googleEmail: connection.googleEmail ?? null,
    lastError: connection.lastError ?? null,
    lastSyncedAt: connection.lastSyncedAt ?? null,
    status: connection.status,
    visibleCalendarIds: connection.visibleCalendarIds,
  };
}
