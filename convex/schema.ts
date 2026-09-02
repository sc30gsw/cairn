import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { boardScheduleColorValidator } from "./lib/boardScheduleColors";
import {
  categoryValidator,
  conditionValidator,
  goalDocumentValidator,
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
  //? 1端末 = 1行。所有者は複数端末を持てる。by_owner は by_owner_and_endpoint の接頭辞なので張らない（CVX-12）
  pushSubscriptions: defineTable({
    endpoint: v.string(),
    expirationTime: v.optional(v.number()),
    keys: pushSubscriptionKeysValidator,
    ownerId: v.string(),
  }).index("by_owner_and_endpoint", ["ownerId", "endpoint"]),

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
