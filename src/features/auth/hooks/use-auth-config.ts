import { useQuery } from "@tanstack/react-query";

import { authPublicConfigQueryOptions } from "~/features/auth/api/auth-queries";
import { useOptionalAuthPublicConfigLiveQuery } from "~/lib/tanstack-db/collections";

export function useAuthPublicConfig() {
  const live = useOptionalAuthPublicConfigLiveQuery();
  const queryResult = useQuery(authPublicConfigQueryOptions());
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
