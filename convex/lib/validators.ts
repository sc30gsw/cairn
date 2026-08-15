import { v } from "convex/values";

import { CATEGORIES } from "./categories";
import { CONDITIONS } from "./conditions";

const [toeic, listening, reading, conversation, other] = CATEGORIES;
const [good, ordinary, collapsed] = CONDITIONS;

export const categoryValidator = v.union(
  v.literal(toeic),
  v.literal(listening),
  v.literal(reading),
  v.literal(conversation),
  v.literal(other),
);

export const statusValidator = v.union(
  v.literal("確定"),
  v.literal("未着手"),
  v.literal("スキップ"),
);

export const conditionValidator = v.union(
  v.literal(good),
  v.literal(ordinary),
  v.literal(collapsed),
);

export const rowDtoValidator = v.object({
  _id: v.id("rows"),
  category: v.string(),
  categorySortOrder: v.number(),
  content: v.string(),
  itemId: v.id("items"),
  itemName: v.string(),
  minutes: v.number(),
  sortOrder: v.number(),
  status: statusValidator,
});

export const dayDtoValidator = v.object({
  _id: v.id("days"),
  condition: v.union(conditionValidator, v.null()),
  dateJst: v.string(),
  memo: v.union(v.string(), v.null()),
});

export const itemDtoValidator = v.object({
  _id: v.id("items"),
  categoryId: v.id("categories"),
  name: v.string(),
});

export const categoryDtoValidator = v.object({
  _id: v.id("categories"),
  name: v.string(),
  sortOrder: v.number(),
});

export const presetDtoValidator = v.object({
  _id: v.id("presets"),
  lines: v.array(
    v.object({
      content: v.string(),
      itemId: v.id("items"),
      itemName: v.string(),
      minutes: v.number(),
    }),
  ),
  name: v.string(),
  weekday: v.number(),
});
