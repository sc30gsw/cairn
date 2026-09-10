import type { OptimisticUpdate } from "convex/browser";
import type { FunctionArgs } from "convex/server";

import { api } from "~/../convex/_generated/api";
import { optimisticId } from "~/lib/optimistic-id";
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

const optimisticallySubscribePush: OptimisticUpdate<
  FunctionArgs<typeof api.mutations.notifications.subscribePush.subscribePush>
> = (localStore, args) => {
  const current = localStore.getQuery(
    api.queries.notifications.pushSubscriptions.pushSubscriptions,
    {},
  );
  if (
    current === undefined ||
    current.some((subscription) => subscription.endpoint === args.endpoint)
  ) {
    return;
  }
  localStore.setQuery(api.queries.notifications.pushSubscriptions.pushSubscriptions, {}, [
    ...current,
    {
      _creationTime: Date.now(),
      _id: optimisticId("pushSubscriptions"),
      endpoint: args.endpoint,
    },
  ]);
};

export function useSubscribePush() {
  return useConvexMutation(
    api.mutations.notifications.subscribePush.subscribePush,
  ).withOptimisticUpdate(optimisticallySubscribePush);
}

export function useUnsubscribePush() {
  return useConvexMutation(
    api.mutations.notifications.unsubscribePush.unsubscribePush,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(
      api.queries.notifications.pushSubscriptions.pushSubscriptions,
      {},
    );
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.notifications.pushSubscriptions.pushSubscriptions,
      {},
      current.filter((subscription) => subscription.endpoint !== args.endpoint),
    );
  });
}
