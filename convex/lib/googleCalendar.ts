import { Result, TaggedError } from "better-result";
import * as v from "valibot";

import type { GoogleCalendarSummary, GoogleEventPayload } from "./validators";

//? Google Calendar API v3 の薄いクライアント。fetch だけで Node API は使わない。
//? 失敗は GoogleCalendarError（status 付き）で返し、呼び手が「権限切れ / 消えている / 再試行」を判定する

export class GoogleCalendarError extends TaggedError("GoogleCalendar")<{
  cause?: unknown;
  message: string;
  operation: string;
  status: number | null;
}> {}

const GOOGLE_CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3";

const MAX_RESULTS = 250;

const dateTimeSchema = v.object({
  date: v.optional(v.string()),
  dateTime: v.optional(v.string()),
  timeZone: v.optional(v.string()),
});

export const googleEventSchema = v.looseObject({
  end: v.optional(dateTimeSchema),
  etag: v.optional(v.string()),
  id: v.string(),
  start: v.optional(dateTimeSchema),
  status: v.optional(v.string()),
  summary: v.optional(v.string()),
  updated: v.optional(v.string()),
});

export type GoogleEvent = v.InferOutput<typeof googleEventSchema>;

const eventListSchema = v.looseObject({
  items: v.optional(v.array(googleEventSchema)),
  nextPageToken: v.optional(v.string()),
  nextSyncToken: v.optional(v.string()),
});

export type GoogleEventList = v.InferOutput<typeof eventListSchema>;

const calendarListEntrySchema = v.looseObject({
  accessRole: v.optional(v.string()),
  backgroundColor: v.optional(v.string()),
  deleted: v.optional(v.boolean()),
  id: v.string(),
  primary: v.optional(v.boolean()),
  selected: v.optional(v.boolean()),
  summary: v.optional(v.string()),
  summaryOverride: v.optional(v.string()),
});

const calendarListSchema = v.looseObject({
  items: v.optional(v.array(calendarListEntrySchema)),
  nextPageToken: v.optional(v.string()),
});

export type GoogleCalendarListEntry = v.InferOutput<typeof calendarListEntrySchema>;

const errorBodySchema = v.looseObject({
  error: v.optional(
    v.looseObject({
      errors: v.optional(v.array(v.looseObject({ reason: v.optional(v.string()) }))),
      message: v.optional(v.string()),
      status: v.optional(v.string()),
    }),
  ),
});

export type GoogleCalendarClient = {
  accessToken: string;
  fetchImpl?: typeof fetch;
};

export function isAuthFailure(error: GoogleCalendarError): boolean {
  return error.status === 401 || error.status === 403;
}

export function isGone(error: GoogleCalendarError): boolean {
  return error.status === 404 || error.status === 410;
}

export function isSyncTokenExpired(error: GoogleCalendarError): boolean {
  return error.status === 410;
}

export function isRetryable(error: GoogleCalendarError): boolean {
  return error.status === null || error.status === 429 || error.status >= 500;
}

type RequestArgs = {
  body?: unknown;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  operation: string;
  path: string;
  query?: Record<string, string | undefined>;
};

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  const parsed = Result.try({
    catch: () => null,
    try: () => v.parse(errorBodySchema, JSON.parse(text)),
  });
  const message = Result.isOk(parsed) ? parsed.value?.error?.message : undefined;
  return message ?? `${String(response.status)} ${response.statusText}`;
}

function parseBody<T>(
  schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
  input: unknown,
  operation: string,
): Result<T, GoogleCalendarError> {
  try {
    return Result.ok(v.parse(schema, input));
  } catch (cause) {
    return Result.err(
      new GoogleCalendarError({
        cause,
        message: "Google カレンダーの応答が想定と違います",
        operation,
        status: null,
      }),
    );
  }
}

async function request<T>(
  client: GoogleCalendarClient,
  args: RequestArgs,
  schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
): Promise<Result<T, GoogleCalendarError>> {
  const url = new URL(`${GOOGLE_CALENDAR_BASE_URL}${args.path}`);
  for (const [key, value] of Object.entries(args.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }
  const fetchImpl = client.fetchImpl ?? fetch;
  const sent = await Result.tryPromise({
    catch: (cause) =>
      new GoogleCalendarError({
        cause,
        message: "Google カレンダーに接続できませんでした",
        operation: args.operation,
        status: null,
      }),
    try: () =>
      fetchImpl(url, {
        body: args.body === undefined ? undefined : JSON.stringify(args.body),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${client.accessToken}`,
          ...(args.body === undefined ? {} : { "content-type": "application/json" }),
        },
        method: args.method,
      }),
  });
  if (Result.isError(sent)) {
    return sent;
  }
  const response = sent.value;
  if (!response.ok) {
    return Result.err(
      new GoogleCalendarError({
        message: await readErrorMessage(response),
        operation: args.operation,
        status: response.status,
      }),
    );
  }
  if (response.status === 204) {
    return parseBody(schema, undefined, args.operation);
  }
  const text = await response.text();
  const json = Result.try({ catch: () => undefined, try: () => JSON.parse(text) as unknown });
  return parseBody(
    schema,
    text === "" ? undefined : Result.isOk(json) ? json.value : text,
    args.operation,
  );
}

function encodeId(id: string): string {
  return encodeURIComponent(id);
}

export function calendarSummaryOf(entry: GoogleCalendarListEntry): GoogleCalendarSummary {
  return {
    backgroundColor: entry.backgroundColor,
    id: entry.id,
    primary: entry.primary === true,
    summary: entry.summaryOverride ?? entry.summary ?? entry.id,
  };
}

//? 表示カレンダーの既定: Google 側で表示中（selected）かつ空き情報だけの共有ではないもの
export function defaultVisibleCalendarIds(entries: readonly GoogleCalendarListEntry[]): string[] {
  const ids: string[] = [];
  for (const entry of entries) {
    if (entry.selected !== false && entry.accessRole !== "freeBusyReader") {
      ids.push(entry.id);
    }
  }
  return ids;
}

export async function listCalendars(
  client: GoogleCalendarClient,
): Promise<Result<GoogleCalendarListEntry[], GoogleCalendarError>> {
  const entries: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;
  do {
    const page = await request(
      client,
      {
        method: "GET",
        operation: "calendarList.list",
        path: "/users/me/calendarList",
        query: { maxResults: String(MAX_RESULTS), pageToken, showDeleted: "false" },
      },
      calendarListSchema,
    );
    if (Result.isError(page)) {
      return page;
    }
    for (const entry of page.value.items ?? []) {
      if (entry.deleted !== true) {
        entries.push(entry);
      }
    }
    pageToken = page.value.nextPageToken;
  } while (pageToken !== undefined);
  return Result.ok(entries);
}

export type ListEventsArgs = {
  calendarId: string;
  pageToken?: string;
  syncToken?: string;
  timeMax?: string;
  timeMin?: string;
};

//? 差分同期: syncToken があれば timeMin / timeMax は付けない（併用不可）。無ければ期間で全件
export async function listEvents(
  client: GoogleCalendarClient,
  args: ListEventsArgs,
): Promise<Result<GoogleEventList, GoogleCalendarError>> {
  const query: Record<string, string | undefined> = {
    maxResults: String(MAX_RESULTS),
    pageToken: args.pageToken,
    showDeleted: "true",
    singleEvents: "true",
  };
  if (args.syncToken !== undefined) {
    query.syncToken = args.syncToken;
  } else {
    query.timeMax = args.timeMax;
    query.timeMin = args.timeMin;
  }
  return request(
    client,
    {
      method: "GET",
      operation: "events.list",
      path: `/calendars/${encodeId(args.calendarId)}/events`,
      query,
    },
    eventListSchema,
  );
}

export async function insertEvent(
  client: GoogleCalendarClient,
  calendarId: string,
  payload: GoogleEventPayload,
): Promise<Result<GoogleEvent, GoogleCalendarError>> {
  return request(
    client,
    {
      body: payload,
      method: "POST",
      operation: "events.insert",
      path: `/calendars/${encodeId(calendarId)}/events`,
    },
    googleEventSchema,
  );
}

export async function patchEvent(
  client: GoogleCalendarClient,
  calendarId: string,
  eventId: string,
  payload: Partial<GoogleEventPayload>,
): Promise<Result<GoogleEvent, GoogleCalendarError>> {
  return request(
    client,
    {
      body: payload,
      method: "PATCH",
      operation: "events.patch",
      path: `/calendars/${encodeId(calendarId)}/events/${encodeId(eventId)}`,
    },
    googleEventSchema,
  );
}

export async function deleteEvent(
  client: GoogleCalendarClient,
  calendarId: string,
  eventId: string,
): Promise<Result<undefined, GoogleCalendarError>> {
  return request(
    client,
    {
      method: "DELETE",
      operation: "events.delete",
      path: `/calendars/${encodeId(calendarId)}/events/${encodeId(eventId)}`,
    },
    v.optional(v.undefined()),
  );
}
