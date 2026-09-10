import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { useOptionalPresetSettingsLiveQuery } from "~/lib/tanstack-db/collections";

export { useItemsList } from "~/hooks/use-items-list";

function presetSettingsQuery() {
  return convexQuery(api.queries.presets.settings.settings, {});
}

export function usePresetSettings() {
  const live = useOptionalPresetSettingsLiveQuery();
  const queryResult = useSuspenseQuery(presetSettingsQuery());
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function presetsListQuery() {
  return convexQuery(api.queries.presets.list.list, {});
}
