import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useNotificationInbox() {
  return useSuspenseQuery(convexQuery(api.queries.notifications.list.list, {}));
}

export function useNotificationSettings() {
  return useSuspenseQuery(convexQuery(api.queries.notifications.settings.settings, {}));
}

export function usePushSubscriptions() {
  return useSuspenseQuery(
    convexQuery(api.queries.notifications.pushSubscriptions.pushSubscriptions, {}),
  );
}

export function useWebPushConfig() {
  return useSuspenseQuery(convexQuery(api.queries.notifications.webPushConfig.webPushConfig, {}));
}
