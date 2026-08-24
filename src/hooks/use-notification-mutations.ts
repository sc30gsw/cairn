import {
  markAllNotificationsReadRef,
  markNotificationsReadRef,
  saveNotificationSettingsRef,
} from "~domain/notificationRefs";

import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useMarkNotificationsRead() {
  return useConvexMutation(markNotificationsReadRef);
}

export function useMarkAllNotificationsRead() {
  return useConvexMutation(markAllNotificationsReadRef);
}

export function useSaveNotificationSettings() {
  return useConvexMutation(saveNotificationSettingsRef);
}
