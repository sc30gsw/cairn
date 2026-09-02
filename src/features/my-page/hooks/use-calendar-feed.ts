import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useCalendarFeedStatus() {
  return useSuspenseQuery(convexQuery(api.queries.calendarFeed.status.status, {}));
}

export function useIssueCalendarFeed() {
  return useConvexMutation(api.mutations.calendarFeed.issue.issue);
}

export function useRevokeCalendarFeed() {
  return useConvexMutation(api.mutations.calendarFeed.revoke.revoke);
}
