import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { notificationListRef, notificationSettingsRef } from "~domain/notificationRefs";

export function useNotificationInbox() {
  return useSuspenseQuery(convexQuery(notificationListRef, {}));
}

export function useNotificationSettings() {
  return useSuspenseQuery(convexQuery(notificationSettingsRef, {}));
}
