import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useNotificationInbox() {
  return useSuspenseQuery(convexQuery(api.queries.notifications.list.list, {}));
}

export function useNotificationSettings() {
  return useSuspenseQuery(convexQuery(api.queries.notifications.settings.settings, {}));
}
