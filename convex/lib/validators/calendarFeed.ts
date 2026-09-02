import { v } from "convex/values";

export const calendarFeedStatusValidator = v.object({
  token: v.union(v.string(), v.null()),
});

//? フィードに載せる終日イベント。本番日と未達成のチェックポイント期限だけ
export const calendarFeedEventValidator = v.object({
  dateJst: v.string(),
  description: v.optional(v.string()),
  summary: v.string(),
  uid: v.string(),
});

export const calendarFeedValidator = v.union(
  v.object({ events: v.array(calendarFeedEventValidator) }),
  v.null(),
);
