import { Suspense } from "react";

import { PresetList } from "~/features/catalog/components/preset-list";
import { PresetListPending } from "~/features/catalog/components/preset-list-pending";
import { PresetSettingsCard } from "~/features/catalog/components/preset-settings-card";
import { useItemsList, usePresetsList } from "~/features/catalog/hooks/catalog-queries";
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
  const { data: queriedItems } = useItemsList();
  const { data: queriedPresets } = usePresetsList();
  const liveItems = useOptionalItemsLiveQuery();
  const livePresets = useOptionalPresetsLiveQuery();

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
