import { v } from "convex/values";

import { NOTIFICATION_KINDS, NOTIFICATION_PENDING_SOURCES } from "../notifications";
import { targetMetricValidator } from "./goals";

const [checkpointDeadlineKind, eveningUntouchedKind, weeklyTargetMissKind] = NOTIFICATION_KINDS;

export const notificationKindValidator = v.union(
  v.literal(checkpointDeadlineKind),
  v.literal(eveningUntouchedKind),
  v.literal(weeklyTargetMissKind),
);

const checkpointDeadlineItemValidator = v.object({
  content: v.string(),
  daysLeft: v.number(),
  deadline: v.string(),
  goalId: v.id("goals"),
});

const weeklyTargetShortfallValidator = v.object({
  categoryName: v.string(),
  current: v.number(),
  metric: targetMetricValidator,
  targetValue: v.number(),
});

export const notificationPayloadValidator = v.union(
  v.object({
    dateJst: v.string(),
    items: v.array(checkpointDeadlineItemValidator),
    kind: v.literal(checkpointDeadlineKind),
  }),
  v.object({
    dateJst: v.string(),
    kind: v.literal(eveningUntouchedKind),
    pendingCount: v.number(),
    source: v.union(...NOTIFICATION_PENDING_SOURCES.map((source) => v.literal(source))),
  }),
  v.object({
    kind: v.literal(weeklyTargetMissKind),
    shortfalls: v.array(weeklyTargetShortfallValidator),
    weekStartJst: v.string(),
  }),
);

export const notificationTriggerPrefsValidator = v.object({
  checkpointDeadline: v.boolean(),
  eveningUntouched: v.boolean(),
  weeklyTargetMiss: v.boolean(),
});

export const notificationDtoValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("notifications"),
  payload: notificationPayloadValidator,
  read: v.boolean(),
});

export const notificationPageValidator = v.object({
  items: v.array(notificationDtoValidator),
  unreadCount: v.number(),
});

export const notificationSettingsDtoValidator = v.object({
  enabled: v.boolean(),
  eveningHourJst: v.number(),
  quietFromHourJst: v.number(),
  quietToHourJst: v.number(),
  triggers: notificationTriggerPrefsValidator,
});

//? PushSubscription.toJSON() の形をそのまま保存する（endpoint / keys.p256dh / keys.auth / expirationTime）
export const pushSubscriptionKeysValidator = v.object({
  auth: v.string(),
  p256dh: v.string(),
});

export const pushSubscriptionInputValidator = v.object({
  endpoint: v.string(),
  expirationTime: v.optional(v.number()),
  keys: pushSubscriptionKeysValidator,
});

export const pushSubscriptionDtoValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("pushSubscriptions"),
  endpoint: v.string(),
});

export const webPushMessageValidator = v.object({
  body: v.string(),
  tag: v.string(),
  title: v.string(),
  url: v.string(),
});

export const webPushDeliveryValidator = v.union(
  v.object({
    message: webPushMessageValidator,
    subscriptions: v.array(
      v.object({
        _id: v.id("pushSubscriptions"),
        endpoint: v.string(),
        keys: pushSubscriptionKeysValidator,
      }),
    ),
  }),
  v.null(),
);

export const webPushConfigValidator = v.object({
  publicKey: v.union(v.string(), v.null()),
});
