import type { NotificationKind } from "./notifications";

//? 通知の種類ごとの遷移先。通知欄のクリックと Web Push の notificationclick が同じ表を読む
const NOTIFICATION_LINKS = {
  checkpointDeadline: "/goals",
  eveningUntouched: "/",
  weeklyTargetMiss: "/review",
} as const satisfies Record<NotificationKind, string>;

export function notificationLink(kind: NotificationKind): string {
  return NOTIFICATION_LINKS[kind];
}
