import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import {
  useOptionalNotificationPageLiveQuery,
  useOptionalNotificationSettingsLiveQuery,
  useOptionalPushSubscriptionsLiveQuery,
  useOptionalWebPushConfigLiveQuery,
} from "~/lib/tanstack-db/collections";

export function useNotificationInbox() {
  const live = useOptionalNotificationPageLiveQuery();
  const queryResult = useSuspenseQuery(convexQuery(api.queries.notifications.list.list, {}));
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function useNotificationSettings() {
  const live = useOptionalNotificationSettingsLiveQuery();
  const queryResult = useSuspenseQuery(
    convexQuery(api.queries.notifications.settings.settings, {}),
  );
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function usePushSubscriptions() {
  const live = useOptionalPushSubscriptionsLiveQuery();
  const queryResult = useSuspenseQuery(
    convexQuery(api.queries.notifications.pushSubscriptions.pushSubscriptions, {}),
  );
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function useWebPushConfig() {
  const live = useOptionalWebPushConfigLiveQuery();
  const queryResult = useSuspenseQuery(
    convexQuery(api.queries.notifications.webPushConfig.webPushConfig, {}),
  );
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
