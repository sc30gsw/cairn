import { makeFunctionReference } from "convex/server";

import type { Id } from "../_generated/dataModel";
import type { NotificationTriggerPrefs } from "./validators";
import type { NotificationPageDto, NotificationSettingsDto, SlackDelivery } from "./validators";

//! codegen(デプロイメント接続が必要)をこの環境で走らせられないため、#56 で追加した関数は名前で
//! 参照する(convex/lib/rowTimerRefs.ts / reviewRefs.ts と同じ前例)。codegen が走ったら
//! api.queries.notifications.* / api.mutations.notifications.* / internal.* に置き換えて本ファイルを消す。
//? 参照の綴りを1箇所に集める。UI・cron・scheduler・テストが同じ定数を使う。

export type SaveNotificationSettingsArgs = {
  enabled: boolean;
  eveningHourJst: number;
  quietFromHourJst: number;
  quietToHourJst: number;
  slackEnabled: boolean;
  //? 未指定 = 既存の URL を保つ。空文字は受け取らない(解除は disconnectSlack)。
  slackWebhookUrl?: string;
  triggers: NotificationTriggerPrefs;
};

//? 実体は internalMutation。cron からはこの1本だけを指す(CVX-05)。
export const evaluateNotificationsRef = makeFunctionReference<"mutation", { now?: number }, null>(
  "mutations/notifications/evaluate:evaluate",
);

export const purgeExpiredNotificationsRef = makeFunctionReference<
  "mutation",
  { now?: number },
  null
>("mutations/notifications/purgeExpired:purgeExpired");

export const markSlackDeliveredRef = makeFunctionReference<
  "mutation",
  { error?: string; notificationId: Id<"notifications"> },
  null
>("mutations/notifications/markSlackDelivered:markSlackDelivered");

export const notificationDeliveryPayloadRef = makeFunctionReference<
  "query",
  Record<"notificationId", Id<"notifications">>,
  SlackDelivery | null
>("queries/notifications/deliveryPayload:deliveryPayload");

//? 実体は internalAction。scheduler からはこの1本だけを指す(CVX-05)。
export const deliverSlackRef = makeFunctionReference<
  "action",
  Record<"notificationId", Id<"notifications">>,
  null
>("actions/notifications/deliverSlack:deliverSlack");

export const notificationListRef = makeFunctionReference<
  "query",
  Record<string, never>,
  NotificationPageDto
>("queries/notifications/list:list");

export const notificationSettingsRef = makeFunctionReference<
  "query",
  Record<string, never>,
  NotificationSettingsDto
>("queries/notifications/settings:settings");

export const saveNotificationSettingsRef = makeFunctionReference<
  "mutation",
  SaveNotificationSettingsArgs,
  Id<"notificationSettings">
>("mutations/notifications/saveSettings:saveSettings");

export const markNotificationsReadRef = makeFunctionReference<
  "mutation",
  Record<"notificationIds", Id<"notifications">[]>,
  null
>("mutations/notifications/markRead:markRead");

export const markAllNotificationsReadRef = makeFunctionReference<
  "mutation",
  Record<string, never>,
  null
>("mutations/notifications/markAllRead:markAllRead");

export const disconnectSlackRef = makeFunctionReference<"mutation", Record<string, never>, null>(
  "mutations/notifications/disconnectSlack:disconnectSlack",
);
