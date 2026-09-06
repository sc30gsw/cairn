import { Result } from "better-result";

import {
  type GoogleCalendarClient,
  GoogleCalendarError,
  isSyncTokenExpired,
  listEvents,
} from "../../lib/googleCalendar";
import type { PulledEvent } from "../../lib/validators";
import { toPulledEvent } from "./pulledEvent";
import type { SyncWindow } from "./window";

type PulledCalendar = {
  events: PulledEvent[];
  keepEventIds: string[] | null;
  syncToken: string | null;
};

export async function pullCalendar(
  client: GoogleCalendarClient,
  args: { calendarId: string; syncToken: string | null; window: SyncWindow },
): Promise<Result<PulledCalendar, GoogleCalendarError>> {
  const incremental = await fetchAll(client, args.calendarId, args.syncToken, args.window);
  if (Result.isOk(incremental)) {
    return incremental;
  }
  if (args.syncToken !== null && isSyncTokenExpired(incremental.error)) {
    return fetchAll(client, args.calendarId, null, args.window);
  }
  return incremental;
}

async function fetchAll(
  client: GoogleCalendarClient,
  calendarId: string,
  syncToken: string | null,
  window: SyncWindow,
): Promise<Result<PulledCalendar, GoogleCalendarError>> {
  const events: PulledEvent[] = [];
  const keepEventIds: string[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;
  do {
    const page = await listEvents(client, {
      calendarId,
      pageToken,
      ...(syncToken === null
        ? { timeMax: window.timeMax, timeMin: window.timeMin }
        : { syncToken }),
    });
    if (Result.isError(page)) {
      return page;
    }
    for (const raw of page.value.items ?? []) {
      const pulled = toPulledEvent(calendarId, raw);
      if (pulled === null) {
        continue;
      }
      events.push(pulled);
      if (pulled.kind === "upsert") {
        keepEventIds.push(pulled.googleEventId);
      }
    }
    pageToken = page.value.nextPageToken;
    nextSyncToken = page.value.nextSyncToken ?? nextSyncToken;
  } while (pageToken !== undefined);
  return Result.ok({
    events,
    keepEventIds: syncToken === null ? keepEventIds : null,
    syncToken: nextSyncToken,
  });
}
