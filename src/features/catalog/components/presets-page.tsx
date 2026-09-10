import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { PresetList } from "~/features/catalog/components/preset-list";
import { PresetListPending } from "~/features/catalog/components/preset-list-pending";
import { PresetSettingsCard } from "~/features/catalog/components/preset-settings-card";
import { presetsListQuery } from "~/features/catalog/hooks/catalog-queries";
import { itemsListQuery } from "~/hooks/use-items-list";
import {
  useOptionalItemsLiveQuery,
  useOptionalPresetsLiveQuery,
} from "~/lib/tanstack-db/collections";

export function PresetsPage() {
  return (
    <Suspense fallback={<PresetListPending />}>
      <PresetsReady />
    </Suspense>
  );
}

function PresetsReady() {
  const liveItems = useOptionalItemsLiveQuery();
  const livePresets = useOptionalPresetsLiveQuery();
  const { data: queriedItems } = useSuspenseQuery(itemsListQuery());
  const { data: queriedPresets } = useSuspenseQuery(presetsListQuery());

  return (
    <PresetList
      items={liveItems.isReady && liveItems.data !== undefined ? liveItems.data : queriedItems}
      presets={
        livePresets.isReady && livePresets.data !== undefined ? livePresets.data : queriedPresets
      }
      settingsCard={<PresetSettingsCard />}
    />
  );
}
