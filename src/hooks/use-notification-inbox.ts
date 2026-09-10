import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import {
  useOptionalNotificationPageLiveQuery,
  useOptionalNotificationSettingsLiveQuery,
} from "~/lib/tanstack-db/collections";

export function useNotificationInbox() {
  const queryResult = useSuspenseQuery(convexQuery(api.queries.notifications.list.list, {}));
  const live = useOptionalNotificationPageLiveQuery();
  return {
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function useNotificationSettings() {
  const queryResult = useSuspenseQuery(
    convexQuery(api.queries.notifications.settings.settings, {}),
  );
  const live = useOptionalNotificationSettingsLiveQuery();
  return {
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function usePushSubscriptions() {
  return useSuspenseQuery(
    convexQuery(api.queries.notifications.pushSubscriptions.pushSubscriptions, {}),
  );
}

export function useWebPushConfig() {
  return useSuspenseQuery(convexQuery(api.queries.notifications.webPushConfig.webPushConfig, {}));
}
