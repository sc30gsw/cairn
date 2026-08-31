import type { NotificationKind } from "~domain/notifications";

const NOTIFICATION_LINKS = {
  checkpointDeadline: "/goals",
  eveningUntouched: "/",
  weeklyTargetMiss: "/review",
} as const satisfies Record<NotificationKind, string>;

export function notificationLink(kind: NotificationKind): string {
  return NOTIFICATION_LINKS[kind];
}
