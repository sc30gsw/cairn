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
    //* 計測(#51)。進行中のときだけ存在する(docs/specs/study-timer.md §4.3)。
    timerAccumulatedMs: v.optional(v.number()),
    //? 自動停止の目印。一時停止と区別して「分数を直してから確定して」と促すためだけに持つ。
    timerAutoStoppedAt: v.optional(v.number()),
    //? 走っている区間の開始時刻(サーバの epoch ms)。undefined = 計測していない。
    timerStartedAt: v.optional(v.number()),
  })
    .index("by_day", ["dayId"])
    .index("by_item", ["itemId"])
    .index("by_owner_and_date", ["ownerId", "dateJst"])
    .index("by_owner_and_deletedAt", ["ownerId", "deletedAt"])
    .index("by_deletedAt", ["deletedAt"])
    //? 所有者の「いま計測中の1件」を引く(runningTimer / stopRunningTimer)。
    .index("by_owner_and_timerStartedAt", ["ownerId", "timerStartedAt"])
    //? cron の全所有者掃除。by_deletedAt / by_owner_and_deletedAt と同じ「全体用+所有者用」の対。
    //? 先頭列が違うので CVX-12 のプレフィックス重複ではない。
    .index("by_timerStartedAt", ["timerStartedAt"]),

  //? 今週専用の計器。1カテゴリ1件は services 側で upsert して守る。週次スナップショットは持たない。
  targets: defineTable({
    categoryId: v.id("categories"),
    metric: targetMetricValidator,
    ownerId: v.string(),
    targetValue: v.number(),
  }).index("by_owner_and_category", ["ownerId", "categoryId"]),

  //? サーバ発の通知1件。dedupeKey が「同じ事実を二度作らない」の唯一の保証。
  //? 文言は保存しない — payload の数値と非正規化テキストから notificationMessage が組む。
  notifications: defineTable({
    dedupeKey: v.string(),
    ownerId: v.string(),
    payload: notificationPayloadValidator,
    readAt: v.optional(v.number()),
  })
    //? 通知欄は _creationTime 降順で読む。CVX-12 の「特定の _creationTime 順が必要」例外に当たる。
    .index("by_owner", ["ownerId"])
    //? 発火時の重複確認。eq(ownerId).eq(dedupeKey) + take(1)。
    .index("by_owner_and_dedupeKey", ["ownerId", "dedupeKey"]),

  //? 通知のオプトイン設定。行が無い = 通知しない。評価器の所有者列挙もこの表から引く。
  notificationSettings: defineTable({
    enabled: v.boolean(),
    eveningHourJst: v.number(),
    ownerId: v.string(),
    triggers: notificationTriggerPrefsValidator,
  })
    .index("by_owner", ["ownerId"])
    //? cron の所有者列挙。夜の催促は時が一致する所有者だけに絞れる。
    .index("by_enabled_and_eveningHourJst", ["enabled", "eveningHourJst"]),

  avatarUploadClaims: defineTable({
    ownerId: v.string(),
  }).index("by_owner", ["ownerId"]),

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
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_startAt", ["ownerId", "startAt"])
    .index("by_row", ["rowId"]),
});
