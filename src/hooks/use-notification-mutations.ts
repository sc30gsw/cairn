import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useMarkNotificationsRead() {
  return useConvexMutation(api.mutations.notifications.markRead.markRead);
}

export function useMarkAllNotificationsRead() {
  return useConvexMutation(api.mutations.notifications.markAllRead.markAllRead);
}

export function useSaveNotificationSettings() {
  return useConvexMutation(api.mutations.notifications.saveSettings.saveSettings);
}

export function useSubscribePush() {
  return useConvexMutation(api.mutations.notifications.subscribePush.subscribePush);
}

export function useUnsubscribePush() {
  return useConvexMutation(api.mutations.notifications.unsubscribePush.unsubscribePush);
}
