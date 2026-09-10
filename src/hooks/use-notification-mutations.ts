import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useMarkNotificationsRead() {
  const mutation = useConvexMutation(api.mutations.notifications.markRead.markRead);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.notifications.list.list, {});
    if (current === undefined) {
      return;
    }
    const ids = new Set(args.notificationIds);
    const items = current.items.map((item) => (ids.has(item._id) ? { ...item, read: true } : item));
    localStore.setQuery(
      api.queries.notifications.list.list,
      {},
      {
        items,
        unreadCount: items.filter((item) => !item.read).length,
      },
    );
  });
}

export function useMarkAllNotificationsRead() {
  const mutation = useConvexMutation(api.mutations.notifications.markAllRead.markAllRead);

  return mutation.withOptimisticUpdate((localStore) => {
    const current = localStore.getQuery(api.queries.notifications.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.notifications.list.list,
      {},
      {
        items: current.items.map((item) => ({ ...item, read: true })),
        unreadCount: 0,
      },
    );
  });
}

export function useSaveNotificationSettings() {
  const mutation = useConvexMutation(api.mutations.notifications.saveSettings.saveSettings);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.notifications.settings.settings, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(api.queries.notifications.settings.settings, {}, args);
  });
}

export function useSubscribePush() {
  return useConvexMutation(api.mutations.notifications.subscribePush.subscribePush);
}

export function useUnsubscribePush() {
  return useConvexMutation(api.mutations.notifications.unsubscribePush.unsubscribePush);
}
