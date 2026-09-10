import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { useOptionalPresetsLiveQuery } from "~/lib/tanstack-db/collections";

export { itemsListQuery } from "~/hooks/use-items-list";

export function presetsListQuery() {
  return convexQuery(api.queries.presets.list.list, {});
}

export function usePresetsList() {
  const live = useOptionalPresetsLiveQuery();
  const queryResult = useSuspenseQuery(presetsListQuery());
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
