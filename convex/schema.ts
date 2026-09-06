import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { boardScheduleColorValidator } from "./lib/boardScheduleColors";
import {
  calendarSyncSourceKindValidator,
  calendarSyncStatusValidator,
  categoryValidator,
  conditionValidator,
  externalChangeValidator,
  goalDocumentValidator,
  googleCalendarSummaryValidator,
  notificationPayloadValidator,
  notificationTriggerPrefsValidator,
  presetLineValidator,
  pushSubscriptionKeysValidator,
  statusValidator,
  targetMetricValidator,
} from "./lib/validators";

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    ownerId: v.string(),
    sortOrder: v.number(),
  })
    .index("by_owner_and_name", ["ownerId", "name"])
    .index("by_owner_and_sortOrder", ["ownerId", "sortOrder"]),

  days: defineTable({
    condition: v.optional(conditionValidator),
    dateJst: v.string(),
    deletedAt: v.optional(v.number()),
    memo: v.optional(v.string()),
    ownerId: v.string(),
  })
    .index("by_owner_and_date", ["ownerId", "dateJst"])
    .index("by_owner_and_deletedAt", ["ownerId", "deletedAt"])
    .index("by_deletedAt", ["deletedAt"]),

  goals: defineTable(goalDocumentValidator).index("by_owner_and_type", ["ownerId", "type"]),

  items: defineTable({
    category: v.optional(categoryValidator),
    categoryId: v.optional(v.id("categories")),
    name: v.string(),
    ownerId: v.string(),
    sortOrder: v.optional(v.number()),
  })
    .index("by_owner_and_name", ["ownerId", "name"])
    .index("by_category_and_sortOrder", ["categoryId", "sortOrder"]),

  methodLanes: defineTable({
    name: v.string(),
    ownerId: v.string(),
    sortOrder: v.number(),
  }).index("by_owner_and_sortOrder", ["ownerId", "sortOrder"]),

  methods: defineTable({
    bodyText: v.string(),
    completionHtml: v.string(),
    laneId: v.id("methodLanes"),
    memoHtml: v.string(),
    name: v.string(),
    nowViewing: v.boolean(),
    ownerId: v.string(),
    sortOrder: v.number(),
  })
    .index("by_lane_and_sortOrder", ["laneId", "sortOrder"])
    .index("by_owner", ["ownerId"]),

  obstaclePlans: defineTable({
    ifText: v.string(),
    ownerId: v.string(),
    thenText: v.string(),
  }).index("by_owner", ["ownerId"]),

  presetSettings: defineTable({
    holidayAsSunday: v.boolean(),
    ownerId: v.string(),
  }).index("by_owner", ["ownerId"]),

  presets: defineTable({
    lines: v.array(presetLineValidator),
    name: v.string(),
    ownerId: v.string(),
    weekday: v.number(),
  }).index("by_owner_and_weekday", ["ownerId", "weekday"]),

  rows: defineTable({
    content: v.string(),
    dateJst: v.string(),
    dayId: v.id("days"),
    deletedAt: v.optional(v.number()),
    itemId: v.id("items"),
    minutes: v.number(),
    ownerId: v.string(),
    sortOrder: v.number(),
    status: statusValidator,
    timerAccumulatedMs: v.optional(v.number()),
    timerAutoStoppedAt: v.optional(v.number()),
    timerStartedAt: v.optional(v.number()),
  })
    .index("by_day", ["dayId"])
    .index("by_item", ["itemId"])
    .index("by_owner_and_date", ["ownerId", "dateJst"])
    .index("by_owner_and_deletedAt", ["ownerId", "deletedAt"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_owner_and_timerStartedAt", ["ownerId", "timerStartedAt"])
    .index("by_timerStartedAt", ["timerStartedAt"]),

  targets: defineTable({
    categoryId: v.id("categories"),
    metric: targetMetricValidator,
    ownerId: v.string(),
    targetValue: v.number(),
  }).index("by_owner_and_category", ["ownerId", "categoryId"]),

  notifications: defineTable({
    dedupeKey: v.string(),
    ownerId: v.string(),
    payload: notificationPayloadValidator,
    readAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_dedupeKey", ["ownerId", "dedupeKey"]),

  notificationSettings: defineTable({
    enabled: v.boolean(),
    eveningHourJst: v.number(),
    ownerId: v.string(),
    quietFromHourJst: v.optional(v.number()),
    quietToHourJst: v.optional(v.number()),
    triggers: notificationTriggerPrefsValidator,
  })
    .index("by_owner", ["ownerId"])
    .index("by_enabled_and_eveningHourJst", ["enabled", "eveningHourJst"]),
  reviewFlags: defineTable({
    content: v.string(),
    dueJst: v.string(),
    itemId: v.id("items"),
    ownerId: v.string(),
    reviewRowId: v.optional(v.id("rows")),
    sourceRowId: v.id("rows"),
    stage: v.number(),
  })
    .index("by_owner_and_dueJst", ["ownerId", "dueJst"])
    .index("by_sourceRow", ["sourceRowId"])
    .index("by_reviewRow", ["reviewRowId"]),
  pushSubscriptions: defineTable({
    endpoint: v.string(),
    expirationTime: v.optional(v.number()),
    keys: pushSubscriptionKeysValidator,
    ownerId: v.string(),
  }).index("by_owner_and_endpoint", ["ownerId", "endpoint"]),

  calendarAuthorizationRequests: defineTable({
    calendarId: v.optional(v.string()),
    expectedGoogleAccountId: v.optional(v.string()),
    expiresAt: v.number(),
    googleAccountId: v.optional(v.string()),
    ownerId: v.string(),
    purpose: v.union(v.literal("read"), v.literal("write")),
    state: v.union(v.literal("pending"), v.literal("authorized"), v.literal("consumed")),
  }).index("by_expiresAt", ["expiresAt"]),

  googleCalendarIdentities: defineTable({
    googleAccountId: v.string(),
    ownerId: v.string(),
    signInAllowed: v.boolean(),
  }).index("by_googleAccountId", ["googleAccountId"]),

  calendarSyncOperations: defineTable({
    connectionId: v.optional(v.id("calendarConnections")),
    expiresAt: v.number(),
    ownerId: v.string(),
  }).index("by_owner_and_connectionId", ["ownerId", "connectionId"]),

  calendarExternalChanges: defineTable({
    connectionId: v.optional(v.id("calendarConnections")),
    settledAt: v.optional(v.number()),
    calendarId: v.string(),
    change: externalChangeValidator,
    googleEventId: v.string(),
    ownerId: v.string(),
  })
    .index("by_owner_and_settledAt", ["ownerId", "settledAt"])
    .index("by_owner_and_calendar_and_event", ["ownerId", "calendarId", "googleEventId"])
    .index("by_owner_and_connectionId_and_calendarId_and_googleEventId", [
      "ownerId",
      "connectionId",
      "calendarId",
      "googleEventId",
    ]),

  calendarOutputSettings: defineTable({
    ownerId: v.string(),
    legacyConnectionId: v.optional(v.id("calendarConnections")),
    connectionId: v.optional(v.id("calendarConnections")),
    calendarId: v.optional(v.string()),
    generation: v.number(),
    changing: v.optional(v.boolean()),
    nextConnectionId: v.optional(v.id("calendarConnections")),
    nextCalendarId: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]),

  calendarEventDeletions: defineTable({
    ownerId: v.string(),
    calendarId: v.string(),
    googleEventId: v.string(),
    deletedAt: v.string(),
  }).index("by_owner_and_calendar_and_event", ["ownerId", "calendarId", "googleEventId"]),

  calendarConnections: defineTable({
    externalReadOnly: v.optional(v.boolean()),
    canWrite: v.optional(v.boolean()),
    externalChangesVersion: v.optional(v.literal(1)),
    disconnecting: v.optional(v.boolean()),
    calendars: v.array(googleCalendarSummaryValidator),
    googleAccountId: v.string(),
    googleEmail: v.optional(v.string()),
    lastError: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    ownerId: v.string(),
    primaryCalendarId: v.string(),
    status: calendarSyncStatusValidator,
    visibleCalendarIds: v.array(v.string()),
  }).index("by_owner_and_googleAccountId", ["ownerId", "googleAccountId"]),

  calendarSyncLinks: defineTable({
    pendingMove: v.optional(
      v.object({
        connectionId: v.id("calendarConnections"),
        calendarId: v.string(),
        googleEventId: v.string(),
        googleUpdated: v.string(),
        payloadKey: v.string(),
      }),
    ),
    connectionId: v.optional(v.id("calendarConnections")),
    appChangedAt: v.optional(v.number()),
    calendarId: v.string(),
    googleEventId: v.string(),
    googleUpdated: v.optional(v.string()),
    ownerId: v.string(),
    payloadKey: v.optional(v.string()),
    sourceId: v.string(),
    sourceKind: calendarSyncSourceKindValidator,
  })
    .index("by_source", ["sourceKind", "sourceId"])
    .index("by_owner_and_pendingCalendarId_and_pendingGoogleEventId", [
      "ownerId",
      "pendingMove.calendarId",
      "pendingMove.googleEventId",
    ])
    .index("by_owner_and_calendar_and_event", ["ownerId", "calendarId", "googleEventId"])
    .index("by_owner_and_connectionId_and_calendarId_and_googleEventId", [
      "ownerId",
      "connectionId",
      "calendarId",
      "googleEventId",
    ]),

  externalCalendarEvents: defineTable({
    lastPullId: v.optional(v.string()),
    connectionId: v.optional(v.id("calendarConnections")),
    colorId: v.optional(v.string()),
    allDay: v.boolean(),
    calendarId: v.string(),
    endAt: v.string(),
    googleEventId: v.string(),
    googleUpdated: v.string(),
    ownerId: v.string(),
    startAt: v.string(),
    title: v.string(),
  })
    .index("by_owner_and_startAt", ["ownerId", "startAt"])
    .index("by_owner_and_calendar_and_event", ["ownerId", "calendarId", "googleEventId"])
    .index("by_owner_and_connectionId_and_calendarId_and_googleEventId", [
      "ownerId",
      "connectionId",
      "calendarId",
      "googleEventId",
    ]),

  calendarSyncCursors: defineTable({
    connectionId: v.optional(v.id("calendarConnections")),
    calendarId: v.string(),
    fullSyncedOnJst: v.string(),
    ownerId: v.string(),
    syncToken: v.string(),
  })
    .index("by_owner_and_calendar", ["ownerId", "calendarId"])
    .index("by_owner_and_connectionId_and_calendarId", ["ownerId", "connectionId", "calendarId"]),

  avatarUploadClaims: defineTable({
    ownerId: v.string(),
  }),

  avatarUploads: defineTable({
    ownerId: v.string(),
    storageId: v.id("_storage"),
  })
    .index("by_owner_and_storage", ["ownerId", "storageId"])
    .index("by_storage", ["storageId"]),

  boardScheduleEvents: defineTable({
    color: v.optional(boardScheduleColorValidator),
    endAt: v.string(),
    ownerId: v.string(),
    rowId: v.id("rows"),
    startAt: v.string(),
    title: v.string(),
  })
    .index("by_owner_and_startAt", ["ownerId", "startAt"])
    .index("by_row", ["rowId"]),
});
