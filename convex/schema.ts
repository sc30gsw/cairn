import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { boardScheduleColorValidator } from "./lib/boardScheduleColors";
import {
  categoryValidator,
  conditionValidator,
  goalDocumentValidator,
  presetLineValidator,
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

  //? by_owner は by_owner_and_type のプレフィックスなので張らない(CVX-12)
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

  obstaclePlans: defineTable({
    ifText: v.string(),
    ownerId: v.string(),
    thenText: v.string(),
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
  })
    .index("by_day", ["dayId"])
    .index("by_item", ["itemId"])
    .index("by_owner_and_date", ["ownerId", "dateJst"])
    .index("by_owner_and_deletedAt", ["ownerId", "deletedAt"])
    .index("by_deletedAt", ["deletedAt"]),

  //? 今週専用の計器。1カテゴリ1件は services 側で upsert して守る。週次スナップショットは持たない。
  targets: defineTable({
    categoryId: v.id("categories"),
    metric: targetMetricValidator,
    ownerId: v.string(),
    targetValue: v.number(),
  }).index("by_owner_and_category", ["ownerId", "categoryId"]),

  boardScheduleEvents: defineTable({
    color: v.optional(boardScheduleColorValidator),
    endAt: v.string(),
    ownerId: v.string(),
    rowId: v.id("rows"),
    startAt: v.string(),
    title: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_startAt", ["ownerId", "startAt"])
    .index("by_row", ["rowId"]),

  avatarUploadClaims: defineTable({
    ownerId: v.string(),
  }).index("by_owner", ["ownerId"]),

  avatarUploads: defineTable({
    ownerId: v.string(),
    storageId: v.id("_storage"),
  })
    .index("by_owner_and_storage", ["ownerId", "storageId"])
    .index("by_storage", ["storageId"]),
});
