import { Result, TaggedError } from "better-result";
import * as v from "valibot";

import type { GoogleCalendarSummary, GoogleEventPayload } from "./validators";

export type GoogleEventTimePatch =
  | { date: string; dateTime: null }
  | { date: null; dateTime: string };

export type GoogleEventPatch = Omit<GoogleEventPayload, "end" | "start" | "colorId"> & {
  colorId?: string | null;
  end: GoogleEventTimePatch;
  start: GoogleEventTimePatch;
};

export class GoogleCalendarError extends TaggedError("GoogleCalendar")<{
  cause?: unknown;
  message: string;
  operation: string;
  reason: string | null;
  status: number | null;
}> {}

const AUTH_FAILURE_REASONS = [
  "accessNotConfigured",
  "insufficientPermissions",
] as const satisfies readonly string[];

const RATE_LIMIT_REASONS = [
  "quotaExceeded",
  "rateLimitExceeded",
  "userRateLimitExceeded",
] as const satisfies readonly string[];

const GOOGLE_CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3";

const FREE_BUSY_ACCESS_ROLE = "freeBusyReader";

const MAX_RESULTS = 250;

const dateTimeSchema = v.object({
  date: v.optional(v.string()),
  dateTime: v.optional(v.string()),
  timeZone: v.optional(v.string()),
});

const conferenceEntryPointSchema = v.looseObject({
  entryPointType: v.optional(v.string()),
  uri: v.optional(v.string()),
});

const conferenceDataSchema = v.looseObject({
  entryPoints: v.optional(v.array(conferenceEntryPointSchema)),
});

export const googleEventSchema = v.looseObject({
  colorId: v.optional(v.string()),
  conferenceData: v.optional(conferenceDataSchema),
  end: v.optional(dateTimeSchema),
  etag: v.optional(v.string()),
  hangoutLink: v.optional(v.string()),
  id: v.string(),
  start: v.optional(dateTimeSchema),
  status: v.optional(v.string()),
  summary: v.optional(v.string()),
  updated: v.optional(v.string()),
});

export type GoogleEvent = v.InferOutput<typeof googleEventSchema>;

export function meetingUrlOf(event: GoogleEvent): string | undefined {
  if (event.hangoutLink !== undefined) {
    return event.hangoutLink;
  }
  const video = event.conferenceData?.entryPoints?.find(
    (entryPoint) => entryPoint.entryPointType === "video",
  );
  return video?.uri;
}

const eventListSchema = v.looseObject({
  items: v.optional(v.array(googleEventSchema)),
  nextPageToken: v.optional(v.string()),
  nextSyncToken: v.optional(v.string()),
});

type GoogleEventList = v.InferOutput<typeof eventListSchema>;

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

type GoogleCalendarListEntry = v.InferOutput<typeof calendarListEntrySchema>;

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
};

export function isAuthFailure(error: GoogleCalendarError): boolean {
  if (error.status === 401) {
    return true;
  }
  if (error.status !== 403) {
    return false;
  }
  return AUTH_FAILURE_REASONS.some((reason) => reason === error.reason);
}

function isRateLimited(error: GoogleCalendarError): boolean {
  return (
    error.status === 429 ||
    (error.status === 403 && RATE_LIMIT_REASONS.some((reason) => reason === error.reason))
  );
}

export function isGone(error: GoogleCalendarError): boolean {
  return error.status === 404 || error.status === 410;
}

export function isSyncTokenExpired(error: GoogleCalendarError): boolean {
  return error.status === 410;
}

export function isRetryable(error: GoogleCalendarError): boolean {
  return (
    error.status === null ||
    (error.status >= 200 && error.status < 300) ||
    isRateLimited(error) ||
    error.status >= 500
  );
}

type RequestArgs = {
  body?: unknown;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  operation: string;
  path: string;
  query?: Record<string, string | undefined>;
};

function readError(text: string, response: Response): { message: string; reason: string | null } {
  const parsed = Result.try({
    catch: () => null,
    try: () => v.parse(errorBodySchema, JSON.parse(text)),
  });
  const body = Result.isOk(parsed) ? parsed.value?.error : undefined;
  return {
    message: body?.message ?? `${String(response.status)} ${response.statusText}`,
    reason: body?.errors?.find((entry) => entry.reason !== undefined)?.reason ?? null,
  };
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
        reason: null,
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
  const sent = await Result.tryPromise({
    catch: (cause) =>
      new GoogleCalendarError({
        cause,
        message: "Google カレンダーに接続できませんでした",
        operation: args.operation,
        reason: null,
        status: null,
      }),
    try: () =>
      fetch(url, {
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
  if (response.status === 204) {
    return parseBody(schema, undefined, args.operation);
  }
  const body = await Result.tryPromise({
    catch: (cause) =>
      new GoogleCalendarError({
        cause,
        message: "Google カレンダーの応答を読み取れませんでした",
        operation: args.operation,
        reason: null,
        status: response.status,
      }),
    try: () => response.text(),
  });
  if (Result.isError(body)) {
    return body;
  }
  const text = body.value;
  if (!response.ok) {
    const { message, reason } = readError(text, response);
    return Result.err(
      new GoogleCalendarError({
        message,
        operation: args.operation,
        reason,
        status: response.status,
      }),
    );
  }
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
    accessRole: entry.accessRole,
    backgroundColor: entry.backgroundColor,
    id: entry.id,
    primary: entry.primary === true,
    summary: entry.summaryOverride ?? entry.summary ?? entry.id,
  };
}

function isSelectableForDisplay(entry: GoogleCalendarListEntry): boolean {
  return entry.selected !== false && entry.accessRole !== FREE_BUSY_ACCESS_ROLE;
}

export function defaultVisibleCalendarIds(entries: readonly GoogleCalendarListEntry[]): string[] {
  const ids: string[] = [];
  for (const entry of entries) {
    if (isSelectableForDisplay(entry)) {
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

type ListEventsArgs = {
  calendarId: string;
  pageToken?: string;
} & ({ syncToken: string } | { timeMax: string; timeMin: string });

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
  if ("syncToken" in args) {
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

export async function getEvent(
  client: GoogleCalendarClient,
  calendarId: string,
  eventId: string,
): Promise<Result<GoogleEvent, GoogleCalendarError>> {
  return request(
    client,
    {
      method: "GET",
      operation: "events.get",
      path: `/calendars/${encodeId(calendarId)}/events/${encodeId(eventId)}`,
    },
    googleEventSchema,
  );
}

export async function insertEvent(
  client: GoogleCalendarClient,
  calendarId: string,
  payload: GoogleEventPayload,
  eventId?: string,
): Promise<Result<GoogleEvent, GoogleCalendarError>> {
  const result = await request(
    client,
    {
      body: eventId === undefined ? payload : { ...payload, id: eventId },
      method: "POST",
      operation: "events.insert",
      path: `/calendars/${encodeId(calendarId)}/events`,
    },
    googleEventSchema,
  );
  return Result.isError(result) && result.error.status === 409 && eventId !== undefined
    ? getEvent(client, calendarId, eventId)
    : result;
}

export async function patchEvent(
  client: GoogleCalendarClient,
  calendarId: string,
  eventId: string,
  payload: GoogleEventPatch | Pick<GoogleEventPatch, "end" | "start">,
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
