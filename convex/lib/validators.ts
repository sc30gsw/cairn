import { v } from "convex/values";

import { CATEGORIES } from "./categories";

export const categoryValidator = v.union(
  v.literal("TOEIC対策"),
  v.literal("多聴"),
  v.literal("多読"),
  v.literal("英会話"),
  v.literal("その他"),
);

export const statusValidator = v.union(
  v.literal("確定"),
  v.literal("未着手"),
  v.literal("スキップ"),
);

export const conditionValidator = v.union(
  v.literal("好調"),
  v.literal("普通"),
  v.literal("崩れた"),
);

export const rowDtoValidator = v.object({
  _id: v.id("rows"),
  category: categoryValidator,
  content: v.string(),
  itemId: v.id("items"),
  itemName: v.string(),
  minutes: v.number(),
  sortOrder: v.number(),
  status: statusValidator,
});

export const dayDtoValidator = v.object({
  _id: v.id("days"),
  bedHm: v.union(v.string(), v.null()),
  condition: v.union(conditionValidator, v.null()),
  dateJst: v.string(),
  memo: v.union(v.string(), v.null()),
  sleepHours: v.union(v.number(), v.null()),
  sleepWarning: v.boolean(),
  wakeHm: v.union(v.string(), v.null()),
});

export const itemDtoValidator = v.object({
  _id: v.id("items"),
  category: categoryValidator,
  name: v.string(),
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

export const categoryOrder = CATEGORIES;
