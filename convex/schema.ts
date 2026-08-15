import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { categoryValidator, conditionValidator, statusValidator } from "./lib/validators";

const presetLine = v.object({
  content: v.string(),
  itemId: v.id("items"),
  minutes: v.number(),
});

export default defineSchema({
  days: defineTable({
    bedHm: v.optional(v.string()),
    condition: v.optional(conditionValidator),
    dateJst: v.string(),
    deletedAt: v.optional(v.number()),
    memo: v.optional(v.string()),
    ownerId: v.string(),
    wakeHm: v.optional(v.string()),
  })
    .index("by_owner_and_date", ["ownerId", "dateJst"])
    .index("by_owner_and_deletedAt", ["ownerId", "deletedAt"]),

  examGoals: defineTable({
    examDate: v.string(),
    maxScore: v.number(),
    minScore: v.number(),
    ownerId: v.string(),
  }).index("by_owner", ["ownerId"]),

  items: defineTable({
    category: categoryValidator,
    name: v.string(),
    ownerId: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_name", ["ownerId", "name"]),

  obstaclePlans: defineTable({
    ifText: v.string(),
    ownerId: v.string(),
    thenText: v.string(),
  }).index("by_owner", ["ownerId"]),

  presets: defineTable({
    lines: v.array(presetLine),
    name: v.string(),
    ownerId: v.string(),
    weekday: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_weekday", ["ownerId", "weekday"]),

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
    .index("by_owner_and_deletedAt", ["ownerId", "deletedAt"]),

  tonight: defineTable({
    bedHm: v.string(),
    ownerId: v.string(),
  }).index("by_owner", ["ownerId"]),

  weeklyGoals: defineTable({
    minutes: v.number(),
    ownerId: v.string(),
    weekStartJst: v.string(),
  }).index("by_owner_and_week", ["ownerId", "weekStartJst"]),
});
