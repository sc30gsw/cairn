import { Result } from "better-result";

import {
  getEvent,
  type GoogleCalendarClient,
  GoogleCalendarError,
  isGone,
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
  args: {
    calendarId: string;
    linkedEventIds?: readonly string[];
    syncToken: string | null;
    window: SyncWindow;
  },
): Promise<Result<PulledCalendar, GoogleCalendarError>> {
  let pulled = await fetchAll(client, args.calendarId, args.syncToken, args.window);
  if (Result.isError(pulled) && args.syncToken !== null && isSyncTokenExpired(pulled.error)) {
    pulled = await fetchAll(client, args.calendarId, null, args.window);
  }
  if (Result.isError(pulled) || pulled.value.keepEventIds === null) {
    return pulled;
  }
  const seen = new Set(pulled.value.events.map((event) => event.googleEventId));
  const missing = [...new Set(args.linkedEventIds ?? [])].filter((id) => !seen.has(id));
  const recovered = await Promise.all(
    missing.map((id) => fetchLinkedEvent(client, args.calendarId, id)),
  );
  for (const event of recovered) {
    if (Result.isError(event)) {
      return event;
    }
    pulled.value.events.push(event.value);
    if (event.value.kind === "upsert") {
      pulled.value.keepEventIds.push(event.value.googleEventId);
    }
  }
  return pulled;
}

async function fetchLinkedEvent(
  client: GoogleCalendarClient,
  calendarId: string,
  googleEventId: string,
): Promise<Result<PulledEvent, GoogleCalendarError>> {
  const event = await getEvent(client, calendarId, googleEventId);
  if (Result.isError(event)) {
    return isGone(event.error) ? Result.ok({ calendarId, googleEventId, kind: "delete" }) : event;
  }
  const pulled = toPulledEvent(calendarId, event.value);
  return pulled === null
    ? Result.err(
        new GoogleCalendarError({
          message: "Google カレンダーの予定の日時を読み取れませんでした",
          operation: "events.get",
          reason: null,
          status: null,
        }),
      )
    : Result.ok(pulled);
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
