import { type Infer, v } from "convex/values";

import { CALENDAR_SYNC_SOURCE_KINDS, CALENDAR_SYNC_STATUSES } from "../calendarSync";
import { GOOGLE_CALENDAR_EVENT_COLORS } from "../googleCalendarColors";

export const calendarSyncStatusValidator = v.union(
  ...CALENDAR_SYNC_STATUSES.map((status) => v.literal(status)),
);

export const calendarSyncSourceKindValidator = v.union(
  ...CALENDAR_SYNC_SOURCE_KINDS.map((kind) => v.literal(kind)),
);

export const googleCalendarSummaryValidator = v.object({
  accessRole: v.optional(v.string()),
  backgroundColor: v.optional(v.string()),
  id: v.string(),
  primary: v.boolean(),
  summary: v.string(),
});

export type GoogleCalendarSummary = Infer<typeof googleCalendarSummaryValidator>;

export const calendarConnectionDtoValidator = v.object({
  connectionId: v.id("calendarConnections"),
  googleAccountId: v.string(),
  externalReadOnly: v.boolean(),
  canWrite: v.boolean(),
  calendars: v.array(googleCalendarSummaryValidator),
  googleEmail: v.union(v.string(), v.null()),
  lastError: v.union(v.string(), v.null()),
  lastSyncedAt: v.union(v.number(), v.null()),
  status: calendarSyncStatusValidator,
  visibleCalendarIds: v.array(v.string()),
});
export type CalendarConnectionDto = Infer<typeof calendarConnectionDtoValidator>;

export const calendarOutputValidator = v.object({
  connectionId: v.id("calendarConnections"),
  calendarId: v.string(),
});
export const calendarSyncOverviewValidator = v.object({
  connections: v.array(calendarConnectionDtoValidator),
  output: v.union(v.null(), calendarOutputValidator),
  outputChanging: v.boolean(),
});
export type CalendarSyncOverview = Infer<typeof calendarSyncOverviewValidator>;

export const googleEventColorIdValidator = v.union(
  v.null(),
  ...GOOGLE_CALENDAR_EVENT_COLORS.map((entry) => v.literal(entry.id)),
);

export const externalCalendarEventDtoValidator = v.object({
  _id: v.id("externalCalendarEvents"),
  allDay: v.boolean(),
  calendarId: v.string(),
  calendarName: v.string(),
  calendarEmail: v.union(v.string(), v.null()),
  colorId: v.union(v.string(), v.null()),
  canEdit: v.boolean(),
  color: v.union(v.string(), v.null()),
  endAt: v.string(),
  startAt: v.string(),
  title: v.string(),
});

export type ExternalCalendarEventDto = Infer<typeof externalCalendarEventDtoValidator>;

export const pulledEventValidator = v.union(
  v.object({
    allDay: v.boolean(),
    calendarId: v.string(),
    endAt: v.string(),
    googleEventId: v.string(),
    kind: v.literal("upsert"),
    colorId: v.optional(v.string()),
    startAt: v.string(),
    title: v.string(),
    updated: v.string(),
  }),
  v.object({
    calendarId: v.string(),
    googleEventId: v.string(),
    kind: v.literal("delete"),
    updated: v.optional(v.string()),
  }),
);

export type PulledEvent = Infer<typeof pulledEventValidator>;

const googleEventTimeValidator = v.union(
  v.object({ date: v.string() }),
  v.object({ dateTime: v.string() }),
);

export type GoogleEventTime = Infer<typeof googleEventTimeValidator>;

export const googleEventPayloadValidator = v.object({
  colorId: v.optional(v.string()),
  description: v.string(),
  end: googleEventTimeValidator,
  start: googleEventTimeValidator,
  summary: v.string(),
  transparency: v.union(v.literal("opaque"), v.literal("transparent")),
});

export type GoogleEventPayload = Infer<typeof googleEventPayloadValidator>;

const syncLinkValidator = v.object({
  connectionId: v.optional(v.id("calendarConnections")),
  calendarId: v.optional(v.string()),
  appChangedAt: v.union(v.number(), v.null()),
  googleEventId: v.string(),
  payloadKey: v.union(v.string(), v.null()),
});

export const syncSourceValidator = v.object({
  desired: v.union(googleEventPayloadValidator, v.null()),
  link: v.union(v.null(), syncLinkValidator),
  payloadKey: v.union(v.string(), v.null()),
  sourceId: v.string(),
  sourceKind: calendarSyncSourceKindValidator,
});

export type SyncSource = Infer<typeof syncSourceValidator>;

export const pushPlanValidator = v.union(
  v.null(),
  v.object({
    connectionId: v.id("calendarConnections"),
    generation: v.number(),
    googleAccountId: v.string(),
    calendarId: v.string(),
    source: syncSourceValidator,
  }),
);

export type PushPlan = Infer<typeof pushPlanValidator>;

export const syncPlanValidator = v.union(
  v.null(),
  v.object({
    connectionId: v.id("calendarConnections"),
    generation: v.number(),
    googleAccountId: v.string(),
    calendarId: v.string(),
    disconnecting: v.boolean(),
    isOutput: v.boolean(),
    cursors: v.array(
      v.object({ calendarId: v.string(), fullSyncedOnJst: v.string(), syncToken: v.string() }),
    ),
    sources: v.array(syncSourceValidator),
    visibleCalendarIds: v.array(v.string()),
  }),
);

export type SyncPlan = Infer<typeof syncPlanValidator>;

export const pushOutcomeValidator = v.union(
  v.object({
    googleEventId: v.string(),
    googleUpdated: v.string(),
    kind: v.literal("upserted"),
    payloadKey: v.string(),
  }),
  v.object({ kind: v.literal("deleted") }),
);

export type PushOutcome = Infer<typeof pushOutcomeValidator>;

export const pushExpectationValidator = v.union(v.null(), syncLinkValidator.fields.googleEventId);

export type PushExpectation = Infer<typeof pushExpectationValidator>;

export const recordPushResultValidator = v.union(
  v.literal("conflict"),
  v.literal("disconnected"),
  v.literal("recorded"),
  v.literal("changed"),
);

export type RecordPushResult = Infer<typeof recordPushResultValidator>;

export const ownerSyncOutcomeValidator = v.union(
  calendarSyncStatusValidator,
  v.literal("notConnected"),
  v.literal("busy"),
);

export type OwnerSyncOutcome = Infer<typeof ownerSyncOutcomeValidator>;

export const upsertConnectionArgsValidator = v.object({
  canWrite: v.optional(v.boolean()),
  calendars: v.array(googleCalendarSummaryValidator),
  defaultVisibleCalendarIds: v.array(v.string()),
  googleAccountId: v.string(),
  googleEmail: v.union(v.string(), v.null()),
  ownerId: v.string(),
});

export type UpsertConnectionArgs = Infer<typeof upsertConnectionArgsValidator>;

export const externalChangeValidator = v.union(
  v.object({
    allDay: v.boolean(),
    endAt: v.string(),
    kind: v.literal("move"),
    title: v.optional(v.string()),
    colorId: v.optional(v.union(v.string(), v.null())),
    startAt: v.string(),
  }),
  v.object({ kind: v.literal("delete") }),
);

export type ExternalChange = Infer<typeof externalChangeValidator>;
