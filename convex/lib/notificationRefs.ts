import { makeFunctionReference } from "convex/server";

import type { Id } from "../_generated/dataModel";
import type { NotificationTriggerPrefs } from "./validators";
import type { NotificationPageDto, NotificationSettingsDto } from "./validators";

//! codegen(デプロイメント接続が必要)をこの環境で走らせられないため、#56 で追加した関数は名前で
//! 参照する(convex/lib/rowTimerRefs.ts / reviewRefs.ts と同じ前例)。codegen が走ったら
//! api.queries.notifications.* / api.mutations.notifications.* / internal.* に置き換えて本ファイルを消す。
//? 参照の綴りを1箇所に集める。UI・cron・scheduler・テストが同じ定数を使う。

export type SaveNotificationSettingsArgs = {
  enabled: boolean;
  eveningHourJst: number;
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
