import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { categoryValidator, conditionValidator, statusValidator } from "./lib/validators";

const presetLine = v.object({
  content: v.string(),
  itemId: v.id("items"),
  minutes: v.number(),
});

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    ownerId: v.string(),
    sortOrder: v.number(),
  })
    .index("by_owner", ["ownerId"])
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

  examGoals: defineTable({
    examDate: v.string(),
    maxScore: v.number(),
    minScore: v.number(),
    ownerId: v.string(),
  }).index("by_owner", ["ownerId"]),

  items: defineTable({
    category: v.optional(categoryValidator),
    categoryId: v.optional(v.id("categories")),
    name: v.string(),
    ownerId: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_name", ["ownerId", "name"])
    .index("by_category", ["categoryId"]),

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
    .index("by_owner_and_deletedAt", ["ownerId", "deletedAt"])
    .index("by_deletedAt", ["deletedAt"]),

  weeklyGoals: defineTable({
    minutes: v.number(),
    ownerId: v.string(),
    weekStartJst: v.string(),
  }).index("by_owner_and_week", ["ownerId", "weekStartJst"]),
});
